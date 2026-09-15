// Package resume implements GET /api/v1/resume and GET /api/v1/resume/:variant.
//
// Both serve one of the PDFs that the Resume repo's build-resume.yml
// workflow compiles and commits to resume/<variant>.pdf on that repo's main
// branch, fetched live through the GitHub Contents API. The site never
// carries its own copy of the PDF, so a wording change in the Resume repo
// shows up here without anyone copying a file by hand.
package resume

import (
	"context"
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
	repoRef        = "main"

	// cacheTTL is roughly the brief's "about 10 minutes": long enough that
	// ordinary visitor traffic never turns into a GitHub API call per
	// request, short enough that a same-day resume edit shows up on the site
	// without a deploy.
	cacheTTL      = 10 * time.Minute
	githubTimeout = 10 * time.Second

	notLoadedMessage      = "could not load resume"
	unknownVariantMessage = "unknown resume variant"
)

// defaultVariant is what GET /api/v1/resume (no :variant) serves. The
// interface contract fixes this: "the site always shows the latest committed
// [fullstack] build."
const defaultVariant = "fullstack"

// variants maps each contract-valid :variant value to the path
// build-resume.yml commits it to in the Resume repo. Anything outside this
// map is a 404, checked before any upstream fetch is attempted.
var variants = map[string]string{
	"fullstack": "resume/fullstack.pdf",
	"frontend":  "resume/frontend.pdf",
	"backend":   "resume/backend.pdf",
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
// never needs one; tests use them to point at an httptest fake GitHub
// Contents API and an injected clock instead of the real network and
// wall-clock time.
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
	pdf, _, err := variantCache.get(func() ([]byte, error) {
		return h.fetchVariant(context.Background(), variant)
	})
	if err != nil {
		// err is a wrapped internal detail (status codes, dial errors,
		// "no token configured") - never GitHub's response body, and never
		// the token. Log it server-side and return the contract's stable,
		// safe message.
		log.Printf("resume: could not load %s variant: %v", variant, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
		return
	}

	c.Header("Cache-Control", "public, max-age=300")
	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="Alex-Cash-Resume-%s.pdf"`, variant))
	c.Data(http.StatusOK, "application/pdf", pdf)
}

// fetchVariant fetches one variant's PDF bytes from the Resume repo's
// Contents API, at repoRef.
//
// The Resume repo is private, so this always needs cfg.ResumeGHToken.
// Unlike internal/handlers/projects's GH_TOKEN, there is no unauthenticated
// fallback to retry here: an anonymous request against a private repo fails
// the same way a bad token does, so a retry would gain nothing. With no
// token configured, this returns an error immediately instead of making a
// request that can only fail - the cache then either serves a previous
// successful fetch as stale, or the handler returns 502 until the token is
// set (see scripts/resume-token-wizard.sh).
func (h *Handler) fetchVariant(ctx context.Context, variant string) ([]byte, error) {
	if h.cfg.ResumeGHToken == "" {
		return nil, fmt.Errorf("RESUME_GH_TOKEN is not configured")
	}

	path := variants[variant]
	url := fmt.Sprintf("%s/repos/%s/%s/contents/%s?ref=%s", h.baseURL, repoOwner, repoName, path, repoRef)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}
	// The raw media type makes the Contents API return the file's bytes
	// directly, instead of a JSON envelope with base64-encoded content - one
	// less decode step, and the Contents API's base64 response caps out at
	// 1MB while the raw one does not.
	req.Header.Set("Accept", "application/vnd.github.raw+json")
	// GitHub rejects requests with no User-Agent at all.
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	req.Header.Set("Authorization", "Bearer "+h.cfg.ResumeGHToken)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// GitHub's error body is not forwarded anywhere - just the status,
		// which is enough to diagnose from server-side logs.
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}
	return body, nil
}
