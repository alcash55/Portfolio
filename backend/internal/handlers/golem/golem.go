// Package golem implements GET /api/v1/golem-miners/latest and
// GET /api/v1/golem-miners/builds/:tag/:file.
//
// The Golem Miners WebGL build lives in a private GitHub release. This
// package resolves the newest production release, downloads its zip with a
// token that only this service holds, checks the zip against SHA256SUMS and
// the release manifest, and serves the four Unity files. The frontend's
// Worker proxies those files and lets Cloudflare cache them, because Render's
// free plan has little outbound bandwidth to spend on a 51 MB data file.
//
// The Worker is the only intended caller of /builds. Every file URL carries
// its release tag, so a cached copy never goes stale and a new build gets new
// URLs.
package golem

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"slices"
	"strconv"
	"time"

	"github.com/alcash55/Portfolio/internal/ttlcache"
	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

const (
	defaultBaseURL = "https://api.github.com"
	repoOwner      = "alcash55"
	repoName       = "Golem-Miners"
	userAgent      = "alcash55-portfolio-backend"

	// releaseTTL is how long a new game build can wait before the site sees
	// it. It costs one authenticated GitHub call a minute at most.
	releaseTTL = time.Minute

	apiTimeout      = 15 * time.Second
	downloadTimeout = 5 * time.Minute

	// releaseListSize is how many recent releases ?tag= may pick from.
	releaseListSize = 30
	maxAPIBody      = 4 << 20

	notLoadedMessage = "could not load the Golem Miners build"
)

// ghRelease is the subset of GitHub's release object this package reads.
type ghRelease struct {
	TagName    string    `json:"tag_name"`
	Draft      bool      `json:"draft"`
	Prerelease bool      `json:"prerelease"`
	Assets     []ghAsset `json:"assets"`
}

// ghAsset is one release asset. URL is the API URL a token-authenticated
// download needs. browser_download_url would 404 on a private repo.
type ghAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Size int64  `json:"size"`
}

// Handler carries the dependencies the Golem Miners routes need.
type Handler struct {
	cfg      config.Config
	client   *http.Client // API calls and small assets
	dlClient *http.Client // the zip, which needs minutes
	baseURL  string

	store  *store
	latest *ttlcache.Cache[ghRelease]
	pinned *ttlcache.Cache[ghRelease]
	recent *ttlcache.Cache[[]ghRelease]
}

// Option configures a Handler beyond its config.Config. Production code never
// needs one. Tests point the handler at a fake GitHub and a fake clock.
type Option func(*Handler)

// WithBaseURL overrides the GitHub API base URL.
func WithBaseURL(u string) Option {
	return func(h *Handler) { h.baseURL = u }
}

// WithHTTPClient overrides the client for every GitHub call.
func WithHTTPClient(c *http.Client) Option {
	return func(h *Handler) { h.client, h.dlClient = c, c }
}

// WithNow overrides the clock the caches and the load limits use.
func WithNow(now func() time.Time) Option {
	return func(h *Handler) {
		h.latest.SetNow(now)
		h.pinned.SetNow(now)
		h.recent.SetNow(now)
		h.store.now = now
	}
}

// WithDir sets the directory builds are written to. The default is a fresh
// directory under the OS temp dir.
func WithDir(dir string) Option {
	return func(h *Handler) { h.store.root = dir }
}

// New builds a Golem Miners handler bound to cfg.
func New(cfg config.Config, opts ...Option) *Handler {
	h := &Handler{
		cfg:      cfg,
		client:   &http.Client{Timeout: apiTimeout},
		dlClient: &http.Client{Timeout: downloadTimeout},
		baseURL:  defaultBaseURL,
		store:    newStore(),
		latest:   ttlcache.New[ghRelease](releaseTTL, time.Now),
		pinned:   ttlcache.New[ghRelease](releaseTTL, time.Now),
		recent:   ttlcache.New[[]ghRelease](releaseTTL, time.Now),
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// fileInfo is one entry in the "files" array of GET /latest. url is a path
// under the API origin. sha256 and size describe the bytes the URL serves.
// contentType and contentEncoding say how a browser must receive the file,
// which is not how the URL sends it.
type fileInfo struct {
	Name            string `json:"name"`
	URL             string `json:"url"`
	SHA256          string `json:"sha256"`
	Size            int64  `json:"size"`
	ContentType     string `json:"contentType"`
	ContentEncoding string `json:"contentEncoding,omitempty"`
}

// response is the body of GET /api/v1/golem-miners/latest. The json tags are
// the wire contract the Worker and the launcher page read.
type response struct {
	Tag          string     `json:"tag"`
	Version      string     `json:"version"`
	GitSHA       string     `json:"gitSha"`
	UnityVersion string     `json:"unityVersion"`
	RunURL       string     `json:"runUrl"`
	BuiltAt      time.Time  `json:"builtAt"`
	Files        []fileInfo `json:"files"`
	// Stale is true when this is not the newest release: GitHub could not be
	// reached, or the newest release failed verification.
	Stale bool `json:"stale"`
}

func describe(b *build, stale bool) response {
	files := make([]fileInfo, 0, len(fileOrder))
	for _, name := range fileOrder {
		bf := b.files[name]
		files = append(files, fileInfo{
			Name:            name,
			URL:             "/api/v1/golem-miners/builds/" + url.PathEscape(b.tag) + "/" + name,
			SHA256:          bf.sha256,
			Size:            bf.size,
			ContentType:     served[name].contentType,
			ContentEncoding: served[name].encoding,
		})
	}
	return response{
		Tag:          b.tag,
		Version:      b.version,
		GitSHA:       b.gitSHA,
		UnityVersion: b.unityVersion,
		RunURL:       b.runURL,
		BuiltAt:      b.builtAt.UTC(),
		Files:        files,
		Stale:        stale,
	}
}

// GetLatest is the gin.HandlerFunc for GET /api/v1/golem-miners/latest.
// ?tag= selects one of the 30 newest releases instead of the default.
func (h *Handler) GetLatest(c *gin.Context) {
	if h.cfg.GolemGHToken == "" {
		h.fail(c, errNotConfigured)
		return
	}
	tag := c.Query("tag")
	if tag != "" && !config.IsGolemTag(tag) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tag"})
		return
	}

	b, stale, err := h.resolve(tag)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, describe(b, stale))
}

// GetFile is the gin.HandlerFunc for GET /api/v1/golem-miners/builds/:tag/:file.
func (h *Handler) GetFile(c *gin.Context) {
	tag, name := c.Param("tag"), c.Param("file")
	info, ok := served[name]
	if !ok || !config.IsGolemTag(tag) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if h.cfg.GolemGHToken == "" {
		h.fail(c, errNotConfigured)
		return
	}

	// A build already on disk needs no GitHub call, so files keep flowing
	// while GitHub is down.
	b := h.store.resident(tag)
	if b == nil {
		var err error
		b, _, err = h.resolveExact(tag)
		if err != nil {
			h.fail(c, err)
			return
		}
	}
	bf := b.files[name]

	f, err := os.Open(bf.path)
	if err != nil {
		log.Printf("golem: open %s for %s: %v", name, tag, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
		return
	}
	defer f.Close()

	hd := c.Writer.Header()
	if info.encoding != "" {
		// The stored gzip goes out as opaque bytes. A Content-Encoding header
		// here makes the Cloudflare Worker's fetch() inflate the body while
		// the header and length still describe the gzip, so the browser
		// would get plain bytes labeled as gzip. The Worker declares the
		// encoding itself, from the same allowlist.
		hd.Set("Content-Type", "application/octet-stream")
	} else {
		hd.Set("Content-Type", info.contentType)
	}
	// The ETag and Last-Modified change with every build. Unity keeps the data
	// file in IndexedDB keyed on them.
	hd.Set("ETag", `"`+bf.sha256+`"`)
	// The URL names the tag, so the bytes behind it never change.
	hd.Set("Cache-Control", "public, max-age=31536000, immutable")
	hd.Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(c.Writer, c.Request, "", b.builtAt, f)
}

// resolve returns the build for tag, or the default build when tag is empty.
// With no tag, a failure to load the newest release falls back to the last
// build that passed verification, marked stale. A tag asked for by name never
// falls back, because the caller wants that build or nothing.
func (h *Handler) resolve(tag string) (*build, bool, error) {
	b, stale, err := h.resolveExact(tag)
	if err != nil && tag == "" {
		if last := h.store.lastGood(); last != nil {
			return last, true, nil
		}
	}
	return b, stale, err
}

func (h *Handler) resolveExact(tag string) (*build, bool, error) {
	rel, isDefault, stale, err := h.release(tag)
	if err != nil {
		log.Printf("golem: resolving release %q: %v", tag, err)
		return nil, false, err
	}
	b, err := h.store.get(rel, isDefault, h.loadBuild)
	if err != nil {
		if !errors.Is(err, errRateLimited) {
			log.Printf("golem: loading %s: %v", rel.TagName, err)
		}
		return nil, false, err
	}
	return b, stale, nil
}

// release finds the release to serve. An empty tag means the default: the
// pinned release when GOLEM_PIN_TAG is set, otherwise GitHub's Latest. isDefault
// is true when the result is that default. stale is true when the answer came
// from a cache after a failed refresh.
func (h *Handler) release(tag string) (rel ghRelease, isDefault, stale bool, err error) {
	def, defStale, defErr := h.defaultRelease()
	if tag == "" {
		return def, true, defStale, defErr
	}
	if defErr == nil && def.TagName == tag {
		return def, true, defStale, nil
	}

	list, listStale, err := h.recent.Get(h.fetchRecent)
	if err != nil {
		return ghRelease{}, false, false, err
	}
	i := slices.IndexFunc(list, func(r ghRelease) bool { return r.TagName == tag })
	if i < 0 {
		return ghRelease{}, false, false, errUnknownTag
	}
	return list[i], false, listStale, nil
}

func (h *Handler) defaultRelease() (ghRelease, bool, error) {
	if h.cfg.GolemPinTag != "" {
		return h.pinned.Get(func() (ghRelease, error) {
			return h.fetchRelease("/releases/tags/" + url.PathEscape(h.cfg.GolemPinTag))
		})
	}
	return h.latest.Get(func() (ghRelease, error) { return h.fetchRelease("/releases/latest") })
}

// fetchRelease reads one release. A tag without the webgl-v prefix is an
// error, so a non-game release marked Latest is never cached or served.
func (h *Handler) fetchRelease(path string) (ghRelease, error) {
	var rel ghRelease
	if err := h.getJSON(path, &rel); err != nil {
		return ghRelease{}, err
	}
	if !config.IsGolemTag(rel.TagName) {
		return ghRelease{}, fmt.Errorf("release tag %q is not a WebGL production tag", rel.TagName)
	}
	if rel.Draft {
		return ghRelease{}, fmt.Errorf("release %s is a draft", rel.TagName)
	}
	return rel, nil
}

func (h *Handler) fetchRecent() ([]ghRelease, error) {
	var all []ghRelease
	if err := h.getJSON("/releases?per_page="+strconv.Itoa(releaseListSize), &all); err != nil {
		return nil, err
	}
	kept := all[:0]
	for _, r := range all {
		if config.IsGolemTag(r.TagName) && !r.Draft && !r.Prerelease {
			kept = append(kept, r)
		}
	}
	return kept, nil
}

// getJSON calls the Golem-Miners repo's API. Nothing from the token or the
// response body is put in the returned error, since errors reach the logs.
func (h *Handler) getJSON(path string, out any) error {
	ctx, cancel := context.WithTimeout(context.Background(), apiTimeout)
	defer cancel()

	u := fmt.Sprintf("%s/repos/%s/%s%s", h.baseURL, repoOwner, repoName, path)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return fmt.Errorf("building request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Authorization", "Bearer "+h.cfg.GolemGHToken)

	resp, err := h.client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d from %s", resp.StatusCode, path)
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxAPIBody)).Decode(out); err != nil {
		return fmt.Errorf("decoding response: %w", err)
	}
	return nil
}

// fail writes the error response for err. The body is the same for every
// upstream cause, so a visitor learns nothing about which step broke. The
// server log has the detail.
func (h *Handler) fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, errNotConfigured):
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": notLoadedMessage})
	case errors.Is(err, errUnknownTag):
		c.JSON(http.StatusNotFound, gin.H{"error": "unknown build"})
	case errors.Is(err, errRateLimited):
		c.Header("Retry-After", strconv.Itoa(int(otherLoadInterval.Seconds())))
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
	default:
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
	}
}
