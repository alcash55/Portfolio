// Package projects implements GET /api/v1/projects: a curated allow-list of
// repos, fetched from the GitHub API and cached for an hour.
package projects

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

// repoOwner is the GitHub account every entry in config.Config.ProjectRepos
// belongs to. A single owner is curated by hand; not worth parameterizing
// per-repo (see TEAM-BRIEF B1).
const repoOwner = "alcash55"

const (
	defaultBaseURL   = "https://api.github.com"
	cacheTTL         = time.Hour
	githubTimeout    = 10 * time.Second
	notLoadedMessage = "could not load projects"
)

// Project is the contract shape for a single entry in the "projects" array
// of GET /api/v1/projects. Field names are exactly what the frontend
// contract requires - see TEAM-BRIEF.md's interface contract.
type Project struct {
	Name        string    `json:"name"`
	Description string    `json:"description"`
	URL         string    `json:"url"`
	Homepage    string    `json:"homepage"`
	Language    string    `json:"language"`
	Stars       int       `json:"stars"`
	Topics      []string  `json:"topics"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// response is the top-level JSON body for GET /api/v1/projects.
type response struct {
	Projects []Project `json:"projects"`
	Stale    bool      `json:"stale"`
}

// githubRepo is the subset of GitHub's repo API response this handler reads.
// description, homepage, and language are all nullable on GitHub's side.
type githubRepo struct {
	Name            string    `json:"name"`
	Description     *string   `json:"description"`
	HTMLURL         string    `json:"html_url"`
	Homepage        *string   `json:"homepage"`
	Language        *string   `json:"language"`
	StargazersCount int       `json:"stargazers_count"`
	Topics          []string  `json:"topics"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Handler carries the dependencies GET /api/v1/projects needs.
type Handler struct {
	cfg     config.Config
	client  *http.Client
	baseURL string
	cache   *cache
}

// Option configures a Handler beyond its config.Config. Production code
// never needs one; tests use them to point at an httptest fake GitHub server
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

// WithNow overrides the clock the cache uses for its TTL (default
// time.Now), so tests can advance past the TTL without sleeping.
func WithNow(now func() time.Time) Option {
	return func(h *Handler) { h.cache.now = now }
}

// New builds a projects handler bound to cfg.
func New(cfg config.Config, opts ...Option) *Handler {
	h := &Handler{
		cfg:     cfg,
		client:  &http.Client{Timeout: githubTimeout},
		baseURL: defaultBaseURL,
		cache:   newCache(cacheTTL, time.Now),
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// GetProjects is the gin.HandlerFunc for GET /api/v1/projects.
func (h *Handler) GetProjects(c *gin.Context) {
	// Deliberately not c.Request.Context(): a refresh triggered by this
	// request may be shared (single-flighted) with other concurrent
	// requests via h.cache, so it must not be canceled just because this
	// particular caller disconnects.
	projects, stale, err := h.cache.get(func() ([]Project, error) {
		return h.fetchAll(context.Background())
	})
	if err != nil {
		// err is a wrapped internal detail (status codes, dial errors) -
		// never GitHub's response body, and never the token. Log it
		// server-side and return the contract's stable, safe message.
		log.Printf("projects: could not load projects: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
		return
	}

	if projects == nil {
		projects = []Project{}
	}
	c.JSON(http.StatusOK, response{Projects: projects, Stale: stale})
}

// fetchAll fetches every allow-listed repo concurrently and returns them in
// allow-list order (cfg.ProjectRepos), regardless of which HTTP round-trip
// finishes first.
//
// A repo that fails to fetch (404, timeout, malformed response, ...) is
// logged and skipped rather than failing the whole response - a visitor
// still gets the projects that did load. Only when every repo fails does
// fetchAll return an error, which the cache then either serves as stale data
// (if something was cached before) or surfaces as a 502.
func (h *Handler) fetchAll(ctx context.Context) ([]Project, error) {
	repos := h.cfg.ProjectRepos
	results := make([]Project, len(repos))
	errs := make([]error, len(repos))

	// A stale/rotated GH_TOKEN rejects every repo the same way, so log the
	// unauthenticated fallback once per refresh, not once per repo - four
	// identical lines from one bad token is noise, not signal.
	var logAuthFallbackOnce sync.Once
	logAuthFallback := func() {
		logAuthFallbackOnce.Do(func() {
			log.Print("projects: GH_TOKEN rejected by GitHub (401/403); retrying this refresh unauthenticated")
		})
	}

	var wg sync.WaitGroup
	for i, name := range repos {
		wg.Add(1)
		go func(i int, name string) {
			defer wg.Done()
			p, err := h.fetchRepo(ctx, name, logAuthFallback)
			results[i] = p
			errs[i] = err
		}(i, name)
	}
	wg.Wait()

	projects := make([]Project, 0, len(repos))
	for i, err := range errs {
		if err != nil {
			log.Printf("projects: fetching %s/%s: %v", repoOwner, repos[i], err)
			continue
		}
		projects = append(projects, results[i])
	}

	if len(projects) == 0 {
		return nil, fmt.Errorf("could not fetch any of %d configured repo(s)", len(repos))
	}
	return projects, nil
}

// fetchRepo fetches and maps a single repo, sending GH_TOKEN if configured.
//
// A stale or rotated token is strictly worse than no token at all: an
// authenticated request GitHub rejects with 401/403 fails outright, while
// the same request sent unauthenticated would likely succeed (60/hr
// unauthenticated vs. 5000/hr authenticated - plenty for four repos behind
// an hour-long cache). So a 401/403 on an authenticated request triggers
// exactly one retry, unauthenticated. Nothing else retries: 404 and 5xx
// aren't credential problems, and a transport error retried instantly is
// unlikely to succeed and just doubles the load on a possibly-struggling
// upstream. onAuthRejected is called (not necessarily just once per
// fetchRepo call, but see fetchAll's single-flighted logger) when the retry
// fires, so the caller can log it once per refresh instead of once per repo.
//
// The returned error never contains the token, even indirectly - only the
// HTTP status or a generic transport-error description.
func (h *Handler) fetchRepo(ctx context.Context, name string, onAuthRejected func()) (Project, error) {
	sendToken := h.cfg.GHToken != ""

	project, status, err := h.doFetchRepo(ctx, name, sendToken)
	if err != nil {
		return Project{}, err
	}
	if status == http.StatusOK {
		return project, nil
	}

	if sendToken && (status == http.StatusUnauthorized || status == http.StatusForbidden) {
		onAuthRejected()
		project, status, err = h.doFetchRepo(ctx, name, false)
		if err != nil {
			return Project{}, err
		}
		if status == http.StatusOK {
			return project, nil
		}
	}

	// GitHub's error body is not forwarded anywhere - just the status, which
	// is enough to diagnose from server-side logs.
	return Project{}, fmt.Errorf("unexpected status %d", status)
}

// doFetchRepo makes one request for name. sendToken controls whether
// Authorization is set at all - not just whether it's empty - since an empty
// bearer token is rejected outright by GitHub, whereas omitting the header
// entirely is a valid unauthenticated request (see TEAM-BRIEF B2). status is
// only meaningful when err is nil; the caller decides what a non-200 status
// means (retry, skip, fail).
func (h *Handler) doFetchRepo(ctx context.Context, name string, sendToken bool) (project Project, status int, err error) {
	url := fmt.Sprintf("%s/repos/%s/%s", h.baseURL, repoOwner, name)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Project{}, 0, fmt.Errorf("building request: %w", err)
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	// GitHub rejects requests with no User-Agent at all.
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	if sendToken {
		req.Header.Set("Authorization", "Bearer "+h.cfg.GHToken)
	}

	resp, err := h.client.Do(req)
	if err != nil {
		return Project{}, 0, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Project{}, resp.StatusCode, nil
	}

	var repo githubRepo
	if err := json.NewDecoder(resp.Body).Decode(&repo); err != nil {
		return Project{}, resp.StatusCode, fmt.Errorf("decoding response: %w", err)
	}

	return toProject(repo), resp.StatusCode, nil
}

// toProject maps a githubRepo onto the contract's Project shape: GitHub's
// null description/homepage/language become "", and a null topics array
// becomes [] - never null, per the interface contract.
func toProject(r githubRepo) Project {
	p := Project{
		Name:      r.Name,
		URL:       r.HTMLURL,
		Stars:     r.StargazersCount,
		Topics:    r.Topics,
		UpdatedAt: r.UpdatedAt,
	}
	if r.Description != nil {
		p.Description = *r.Description
	}
	if r.Homepage != nil {
		p.Homepage = *r.Homepage
	}
	if r.Language != nil {
		p.Language = *r.Language
	}
	if p.Topics == nil {
		p.Topics = []string{}
	}
	return p
}
