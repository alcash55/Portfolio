// Package ciactions implements GET /api/v1/ci-actions: the actions in
// alcash55/ac-composite-actions, read from GitHub and cached for an hour, so
// the AC Composite Actions figure follows the repo without a site rebuild.
package ciactions

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/alcash55/Portfolio/internal/ttlcache"
	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

const (
	repoOwner  = "alcash55"
	repoName   = "ac-composite-actions"
	repoBranch = "main"
)

const (
	defaultBaseURL    = "https://api.github.com"
	defaultRawBaseURL = "https://raw.githubusercontent.com"
	cacheTTL          = time.Hour
	githubTimeout     = 10 * time.Second
	// refreshTimeout bounds one whole refresh (the tree plus every action
	// file), so a slow upstream cannot hold a single-flighted refresh open
	// for every waiting request.
	refreshTimeout   = 30 * time.Second
	notLoadedMessage = "could not load ci actions"

	// Caps on what is read from GitHub. A tree for this repo is a few KiB and
	// an action.yml is under 10 KiB, so these only matter if an upstream
	// misbehaves.
	maxTreeBytes = 8 << 20
	maxFileBytes = 256 << 10
	// fetchWorkers bounds concurrent raw-file requests during a refresh.
	fetchWorkers = 8
)

// Action is one entry of the "actions" array in GET /api/v1/ci-actions. The
// json tags are the wire contract the frontend consumes. description is ""
// when the action's YAML has none or could not be read.
type Action struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// response is the top-level JSON body for GET /api/v1/ci-actions. actions and
// treeSha mirror what the retired frontend build script wrote to
// src/generated/ciActions.ts.
type response struct {
	Actions []Action `json:"actions"`
	TreeSHA string   `json:"treeSha"`
	Stale   bool     `json:"stale"`
}

// snapshot is what one successful refresh produces and the cache holds.
type snapshot struct {
	actions []Action
	treeSHA string
}

// Handler carries the dependencies GET /api/v1/ci-actions needs.
type Handler struct {
	cfg        config.Config
	client     *http.Client
	baseURL    string
	rawBaseURL string
	cache      *ttlcache.Cache[snapshot]
}

// Option configures a Handler beyond its config.Config. Production code
// never needs one; tests use them to point at an httptest fake GitHub server
// and an injected clock.
type Option func(*Handler)

// WithBaseURL overrides the GitHub API base URL (default
// "https://api.github.com").
func WithBaseURL(url string) Option {
	return func(h *Handler) { h.baseURL = url }
}

// WithRawBaseURL overrides the host the action YAML files are read from
// (default "https://raw.githubusercontent.com").
func WithRawBaseURL(url string) Option {
	return func(h *Handler) { h.rawBaseURL = url }
}

// WithHTTPClient overrides the HTTP client used to call GitHub.
func WithHTTPClient(client *http.Client) Option {
	return func(h *Handler) { h.client = client }
}

// WithNow overrides the clock the cache uses for its TTL (default
// time.Now), so tests can advance past the TTL without sleeping.
func WithNow(now func() time.Time) Option {
	return func(h *Handler) { h.cache.SetNow(now) }
}

// New builds a ci-actions handler bound to cfg.
func New(cfg config.Config, opts ...Option) *Handler {
	h := &Handler{
		cfg:        cfg,
		client:     &http.Client{Timeout: githubTimeout},
		baseURL:    defaultBaseURL,
		rawBaseURL: defaultRawBaseURL,
		cache:      ttlcache.New[snapshot](cacheTTL, time.Now),
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// GetCIActions is the gin.HandlerFunc for GET /api/v1/ci-actions.
func (h *Handler) GetCIActions(c *gin.Context) {
	// Deliberately not c.Request.Context(): a refresh triggered by this
	// request may be shared (single-flighted) with other concurrent
	// requests via h.cache, so it must not be canceled just because this
	// particular caller disconnects.
	snap, stale, err := h.cache.Get(func() (snapshot, error) {
		ctx, cancel := context.WithTimeout(context.Background(), refreshTimeout)
		defer cancel()
		return h.fetchAll(ctx)
	})
	if err != nil {
		// err is a wrapped internal detail (status codes, dial errors) -
		// never GitHub's response body, and never the token. Log it
		// server-side and return a stable, safe message.
		log.Printf("ci-actions: could not load ci actions: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
		return
	}

	c.JSON(http.StatusOK, response{Actions: snap.actions, TreeSHA: snap.treeSHA, Stale: stale})
}

// fetchAll reads the repo's tree, then each action's YAML for its
// description. A file that cannot be read is logged and listed with an empty
// description rather than failing the list: the frontend has its own written
// sentence for the actions it knows. An error here means the tree itself was
// unusable, so the cache either serves older data or the handler returns 502.
func (h *Handler) fetchAll(ctx context.Context) (snapshot, error) {
	tree, err := h.fetchTree(ctx)
	if err != nil {
		return snapshot{}, err
	}
	files, err := actionPaths(tree)
	if err != nil {
		return snapshot{}, err
	}
	if len(files) == 0 {
		return snapshot{}, fmt.Errorf("%s/%s lists no actions", repoOwner, repoName)
	}

	actions := make([]Action, len(files))
	sem := make(chan struct{}, fetchWorkers)
	var wg sync.WaitGroup
	for i, f := range files {
		wg.Add(1)
		sem <- struct{}{}
		go func(i int, f actionFile) {
			defer wg.Done()
			defer func() { <-sem }()

			actions[i] = Action{Name: f.name}
			yaml, err := h.fetchFile(ctx, f.file)
			if err != nil {
				log.Printf("ci-actions: reading %s: %v", f.file, err)
				return
			}
			actions[i].Description = firstSentence(descriptionOf(yaml))
		}(i, f)
	}
	wg.Wait()

	return snapshot{actions: actions, treeSHA: tree.SHA}, nil
}

// fetchTree reads the whole repo tree in one call, sending GH_TOKEN if
// configured.
//
// As in the projects handler, a stale or rotated token is strictly worse
// than none: the repo is public, so a request GitHub rejects with 401/403
// is retried once unauthenticated. Nothing else retries. The returned error
// never contains the token.
func (h *Handler) fetchTree(ctx context.Context) (githubTree, error) {
	sendToken := h.cfg.GHToken != ""

	tree, status, err := h.doFetchTree(ctx, sendToken)
	if err != nil {
		return githubTree{}, err
	}
	if status == http.StatusOK {
		return tree, nil
	}

	if sendToken && (status == http.StatusUnauthorized || status == http.StatusForbidden) {
		log.Print("ci-actions: GH_TOKEN rejected by GitHub (401/403); retrying this refresh unauthenticated")
		tree, status, err = h.doFetchTree(ctx, false)
		if err != nil {
			return githubTree{}, err
		}
		if status == http.StatusOK {
			return tree, nil
		}
	}

	// GitHub's error body is not forwarded anywhere, just the status.
	return githubTree{}, fmt.Errorf("tree request: unexpected status %d", status)
}

// doFetchTree makes one tree request. status is only meaningful when err is
// nil; the caller decides what a non-200 status means.
func (h *Handler) doFetchTree(ctx context.Context, sendToken bool) (tree githubTree, status int, err error) {
	target := fmt.Sprintf("%s/repos/%s/%s/git/trees/%s?recursive=1", h.baseURL, repoOwner, repoName, repoBranch)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return githubTree{}, 0, fmt.Errorf("building tree request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	// GitHub rejects requests with no User-Agent at all.
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	if sendToken {
		req.Header.Set("Authorization", "Bearer "+h.cfg.GHToken)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return githubTree{}, 0, fmt.Errorf("tree request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return githubTree{}, resp.StatusCode, nil
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxTreeBytes)).Decode(&tree); err != nil {
		return githubTree{}, resp.StatusCode, fmt.Errorf("decoding tree: %w", err)
	}
	return tree, resp.StatusCode, nil
}

// fetchFile reads one file from the repo's default branch. It never sends
// GH_TOKEN: the repo is public, and the token should not go to a second host
// for files that need no credential.
func (h *Handler) fetchFile(ctx context.Context, repoPath string) (string, error) {
	segments := strings.Split(repoPath, "/")
	for i, s := range segments {
		segments[i] = url.PathEscape(s)
	}
	target := fmt.Sprintf("%s/%s/%s/%s/%s", h.rawBaseURL, repoOwner, repoName, repoBranch, strings.Join(segments, "/"))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
	if err != nil {
		return "", fmt.Errorf("building request: %w", err)
	}
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")

	resp, err := h.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxFileBytes))
	if err != nil {
		return "", fmt.Errorf("reading body: %w", err)
	}
	return string(body), nil
}
