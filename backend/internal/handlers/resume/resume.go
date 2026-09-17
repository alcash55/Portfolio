// Package resume implements GET /api/v1/resume and GET /api/v1/resume/:variant.
//
// Both serve one of the PDFs attached to the Resume repo's latest GitHub
// Release. That repo's build-resume.yml workflow only cuts a release after
// a successful build on main, so a broken build leaves the previous good
// resume in place rather than publishing a stale or broken one - unlike
// reading a path straight off a branch, which serves whatever the last
// commit left behind, build failure or not.
package resume

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

const (
	defaultBaseURL = "https://api.github.com"
	repoOwner      = "alcash55"
	repoName       = "Resume"

	// cacheTTL is roughly the brief's "about 10 minutes": long enough that
	// ordinary visitor traffic never turns into a GitHub API call per
	// request, short enough that a new release shows up on the site without
	// a deploy.
	cacheTTL      = 10 * time.Minute
	githubTimeout = 10 * time.Second

	notLoadedMessage      = "could not load resume"
	unknownVariantMessage = "unknown resume variant"

	// versionHeader reports which release a successful response came from,
	// so a stale-looking resume can be traced back to a specific tag
	// without guessing from a timestamp.
	versionHeader = "X-Resume-Version"
)

// defaultVariant is what GET /api/v1/resume (no :variant) serves. The
// interface contract fixes this: "the site always shows the latest
// [fullstack] release."
const defaultVariant = "fullstack"

// variants maps each contract-valid :variant value to the release asset
// name build-resume.yml attaches for it. Anything outside this map is a
// 404, checked before any upstream fetch is attempted.
var variants = map[string]string{
	"fullstack": "fullstack.pdf",
	"frontend":  "frontend.pdf",
	"backend":   "backend.pdf",
}

// resumeAsset is what one successful fetch produces, and what one cache
// entry holds: the PDF bytes plus the release tag they came from. The tag
// travels with the bytes rather than being tracked separately, so a served
// response - fresh or stale - always reports the release it actually came
// from, never a tag that has since moved on.
type resumeAsset struct {
	pdf []byte
	tag string
}

// fetchStage names the step of one fetch that failed, so a log line or the
// status diagnostic can say which of "cut a release", "fix build-resume.yml's
// asset list", "GitHub is down", or "the response wasn't really a PDF" is
// the actual problem, instead of one opaque "could not load resume" for all
// four.
type fetchStage string

const (
	stageResolveRelease fetchStage = "resolve_release"
	stageSelectAsset    fetchStage = "select_asset"
	stageDownloadAsset  fetchStage = "download_asset"
	stageVerifyPDF      fetchStage = "verify_pdf"
)

// fetchFailure is what fetchLatestRelease and downloadAsset return on
// failure: the stage that failed, the upstream HTTP status when there is
// one, and the underlying error. None of its fields, nor anything wrapped
// into err, may ever be built from the token or an Authorization header -
// this is what both the log line and the status diagnostic serialize
// directly.
type fetchFailure struct {
	stage  fetchStage
	status int // 0 when the failure has no associated HTTP status (a dial error, a timeout)
	err    error
}

func (f *fetchFailure) Error() string {
	if f.status != 0 {
		return fmt.Sprintf("stage=%s status=%d: %v", f.stage, f.status, f.err)
	}
	return fmt.Sprintf("stage=%s: %v", f.stage, f.err)
}

func (f *fetchFailure) Unwrap() error { return f.err }

// errTokenNotConfigured is fetchVariant's error when cfg.ResumeGHToken is
// empty. It is a sentinel rather than a *fetchFailure because the two need
// different HTTP responses: this is a deploy waiting on a token, not
// GitHub failing to answer a request that was never sent.
var errTokenNotConfigured = errors.New("resume token not configured")

// failureReason turns a fetchVariant error into a short, greppable string
// safe to log and to return from GET /api/v1/resume/status. It is built
// only from fetchFailure's stage/status fields and errTokenNotConfigured's
// fixed message, neither of which can ever carry the token.
func failureReason(err error) string {
	if errors.Is(err, errTokenNotConfigured) {
		return "stage=not_configured: " + errTokenNotConfigured.Error()
	}
	var ff *fetchFailure
	if errors.As(err, &ff) {
		return ff.Error()
	}
	return err.Error()
}

// Handler carries the dependencies GET /api/v1/resume[/:variant] needs.
type Handler struct {
	cfg     config.Config
	client  *http.Client
	baseURL string

	// caches holds one *cache per variant rather than one cache shared
	// across all three, so a cold-cache fetch for one variant can never
	// block a concurrent request for a different, already-cached one.
	caches map[string]*cache
}

// Option configures a Handler beyond its config.Config. Production code
// never needs one; tests use them to point at an httptest fake GitHub API
// and an injected clock instead of the real network and wall-clock time.
type Option func(*Handler)

// WithBaseURL overrides the GitHub API base URL (default
// "https://api.github.com").
func WithBaseURL(url string) Option {
	return func(h *Handler) { h.baseURL = url }
}

// WithHTTPClient overrides the HTTP client used to call GitHub.
func WithHTTPClient(client *http.Client) Option {
	return func(h *Handler) { h.client = client }
}

// WithNow overrides the clock every per-variant cache uses for its TTL
// (default time.Now), so tests can advance past the TTL without sleeping.
func WithNow(now func() time.Time) Option {
	return func(h *Handler) {
		for _, c := range h.caches {
			c.now = now
		}
	}
}

// New builds a resume handler bound to cfg, with one cache pre-built per
// entry in variants.
func New(cfg config.Config, opts ...Option) *Handler {
	h := &Handler{
		cfg:     cfg,
		client:  &http.Client{Timeout: githubTimeout},
		baseURL: defaultBaseURL,
		caches:  make(map[string]*cache, len(variants)),
	}
	for variant := range variants {
		h.caches[variant] = newCache(cacheTTL, time.Now)
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// GetResume is the gin.HandlerFunc for GET /api/v1/resume: always the
// fullstack variant, per the interface contract.
func (h *Handler) GetResume(c *gin.Context) {
	h.serveVariant(c, defaultVariant)
}

// GetResumeVariant is the gin.HandlerFunc for GET /api/v1/resume/:variant.
// A variant outside the contract's fullstack/frontend/backend gets 404 with
// the existing JSON error shape, before any upstream fetch is attempted.
func (h *Handler) GetResumeVariant(c *gin.Context) {
	variant := c.Param("variant")
	if _, ok := variants[variant]; !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": unknownVariantMessage})
		return
	}
	h.serveVariant(c, variant)
}

// GetResumeStatus is the gin.HandlerFunc for GET /api/v1/resume/status: a
// read-only diagnostic answering "is this misconfigured or is GitHub down"
// from the response alone, with no Render dashboard visit needed. It never
// returns anything but the token's presence as a bare boolean - not the
// value, a prefix, a length, or a hash of it.
func (h *Handler) GetResumeStatus(c *gin.Context) {
	variantStatus := make(gin.H, len(variants))
	for variant := range variants {
		st := h.caches[variant].status()

		entry := gin.H{
			"cached":            st.cached,
			"releaseTag":        st.releaseTag,
			"lastFailureReason": st.lastFailure,
		}
		if st.lastSuccessAt.IsZero() {
			entry["lastSuccessAt"] = nil
		} else {
			entry["lastSuccessAt"] = st.lastSuccessAt.UTC().Format(time.RFC3339)
		}
		if st.lastFailureAt.IsZero() {
			entry["lastFailureAt"] = nil
		} else {
			entry["lastFailureAt"] = st.lastFailureAt.UTC().Format(time.RFC3339)
		}
		variantStatus[variant] = entry
	}

	c.JSON(http.StatusOK, gin.H{
		"tokenConfigured": h.cfg.ResumeGHToken != "",
		"variants":        variantStatus,
	})
}

// serveVariant fetches variant (through its cache) and writes it as the
// contract's PDF response, or a 502 with the JSON error shape if there is
// nothing to serve.
func (h *Handler) serveVariant(c *gin.Context, variant string) {
	variantCache := h.caches[variant]

	// Deliberately not c.Request.Context(): a refresh triggered by this
	// request may be shared (single-flighted) with other concurrent
	// requests via variantCache, so it must not be canceled just because
	// this particular caller disconnects. Matches
	// internal/handlers/projects's GetProjects.
	asset, _, err := variantCache.get(func() (resumeAsset, error) {
		result, fetchErr := h.fetchVariant(context.Background(), variant)
		if fetchErr != nil {
			// Logged at the point of failure, not only when it reaches the
			// caller below: a stale cache entry can make get() return this
			// same failure as a 200 with old data instead, and that path
			// must not go silent just because a visitor never saw it.
			// failureReason is built only from fetchFailure's stage/status
			// fields and the not-configured sentinel - never from the
			// token or an Authorization header.
			log.Printf("resume: %s fetch failed: %s", variant, failureReason(fetchErr))
		}
		return result, fetchErr
	})
	if err != nil {
		// A missing token is a deploy waiting on configuration, not GitHub
		// failing to answer - callers that can tell the two apart (uptime
		// checks, the Render dashboard) get a different status for it. The
		// JSON body stays the same either way: a visitor's browser has no
		// action to take regardless of which upstream step failed, and
		// splitting the message by cause would only give an attacker a way
		// to distinguish "no release" from "no asset" from "bad token".
		status := http.StatusBadGateway
		if errors.Is(err, errTokenNotConfigured) {
			status = http.StatusServiceUnavailable
		}
		c.JSON(status, gin.H{"error": notLoadedMessage})
		return
	}

	c.Header(versionHeader, asset.tag)
	c.Header("Cache-Control", "public, max-age=300")
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="Alex-Cash-Resume-%s.pdf"`, variant))
	c.Data(http.StatusOK, "application/pdf", asset.pdf)
}

// ghRelease is the subset of GitHub's release object this package reads.
type ghRelease struct {
	TagName string    `json:"tag_name"`
	Assets  []ghAsset `json:"assets"`
}

// ghAsset is the subset of GitHub's release-asset object this package
// reads. URL is the asset's API URL (what the asset-download request below
// needs); GitHub also publishes browser_download_url, which requires no
// auth and redirects to short-lived storage - the wrong pick here, since
// the Resume repo is private and an unauthenticated redirect target would
// just 404.
type ghAsset struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// fetchVariant fetches variant's PDF bytes from the Resume repo's latest
// release: first GET releases/latest to find the release and the asset it
// carries for variant, then GET that asset's own URL for the bytes.
//
// The Resume repo is private, so this always needs cfg.ResumeGHToken.
// Unlike internal/handlers/projects's GH_TOKEN, there is no unauthenticated
// fallback to retry here: an anonymous request against a private repo fails
// the same way a bad token does, so a retry would gain nothing. With no
// token configured, this returns an error immediately instead of making a
// request that can only fail - the cache then either serves a previous
// successful fetch as stale, or the handler returns 502 until the token is
// set (see scripts/resume-token-wizard.sh).
func (h *Handler) fetchVariant(ctx context.Context, variant string) (resumeAsset, error) {
	if h.cfg.ResumeGHToken == "" {
		return resumeAsset{}, errTokenNotConfigured
	}

	release, err := h.fetchLatestRelease(ctx)
	if err != nil {
		return resumeAsset{}, err
	}

	assetName := variants[variant]
	var assetURL string
	for _, a := range release.Assets {
		if a.Name == assetName {
			assetURL = a.URL
			break
		}
	}
	if assetURL == "" {
		return resumeAsset{}, &fetchFailure{
			stage: stageSelectAsset,
			err:   fmt.Errorf("release %s has no %s asset", release.TagName, assetName),
		}
	}

	pdf, err := h.downloadAsset(ctx, assetURL)
	if err != nil {
		return resumeAsset{}, err
	}

	return resumeAsset{pdf: pdf, tag: release.TagName}, nil
}

// fetchLatestRelease reads the Resume repo's newest release and its asset
// list. GitHub answers 404 here when the repo has no releases yet, which
// this surfaces as a plain error - build-resume.yml's first successful run
// is what makes this endpoint work at all.
func (h *Handler) fetchLatestRelease(ctx context.Context) (ghRelease, error) {
	url := fmt.Sprintf("%s/repos/%s/%s/releases/latest", h.baseURL, repoOwner, repoName)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return ghRelease{}, &fetchFailure{stage: stageResolveRelease, err: fmt.Errorf("building request: %w", err)}
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	// GitHub rejects requests with no User-Agent at all.
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	req.Header.Set("Authorization", "Bearer "+h.cfg.ResumeGHToken)

	resp, err := h.client.Do(req)
	if err != nil {
		return ghRelease{}, &fetchFailure{stage: stageResolveRelease, err: fmt.Errorf("request failed: %w", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// GitHub's error body is not forwarded anywhere - just the status,
		// which is enough to diagnose from server-side logs.
		return ghRelease{}, &fetchFailure{
			stage:  stageResolveRelease,
			status: resp.StatusCode,
			err:    fmt.Errorf("unexpected status %d fetching latest release", resp.StatusCode),
		}
	}

	var release ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return ghRelease{}, &fetchFailure{stage: stageResolveRelease, err: fmt.Errorf("decoding release: %w", err)}
	}
	return release, nil
}

// pdfMagic is the byte sequence every PDF file starts with.
const pdfMagic = "%PDF-"

// downloadAsset fetches one release asset's raw bytes from its API URL and
// verifies the result is actually a PDF.
//
// Accept: application/octet-stream is what makes GitHub return the asset's
// raw bytes here. Ask for anything else - or nothing - and GitHub instead
// returns the asset's JSON metadata with a 200 OK, which would otherwise
// sail straight through as if it were a valid response and get served to a
// visitor as their resume. The magic-bytes check below is the backstop for
// that same failure mode: even with the right header, "verify it's actually
// a PDF" costs one prefix comparison and catches this class of bug outright
// rather than trusting the status code alone.
func (h *Handler) downloadAsset(ctx context.Context, assetURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, assetURL, nil)
	if err != nil {
		return nil, &fetchFailure{stage: stageDownloadAsset, err: fmt.Errorf("building request: %w", err)}
	}
	req.Header.Set("Accept", "application/octet-stream")
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	req.Header.Set("Authorization", "Bearer "+h.cfg.ResumeGHToken)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, &fetchFailure{stage: stageDownloadAsset, err: fmt.Errorf("request failed: %w", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, &fetchFailure{
			stage:  stageDownloadAsset,
			status: resp.StatusCode,
			err:    fmt.Errorf("unexpected status %d", resp.StatusCode),
		}
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, &fetchFailure{stage: stageDownloadAsset, err: fmt.Errorf("reading response: %w", err)}
	}
	if !bytes.HasPrefix(body, []byte(pdfMagic)) {
		return nil, &fetchFailure{
			stage: stageVerifyPDF,
			err:   fmt.Errorf("response was not a PDF (%d bytes, missing %q magic bytes)", len(body), pdfMagic),
		}
	}
	return body, nil
}
