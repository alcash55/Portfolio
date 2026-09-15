package resume

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// --- test fixtures and helpers ---

// fakeClock lets tests move the cache's TTL clock forward deterministically
// instead of sleeping, matching internal/handlers/projects's pattern.
type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func newFakeClock(start time.Time) *fakeClock {
	return &fakeClock{now: start}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

// pathFixture describes how a fake GitHub Contents API should respond for
// one request path.
type pathFixture struct {
	status int // defaults to http.StatusOK when zero
	body   string
}

// newFakeGitHub builds an httptest server that serves fixtures keyed by the
// request path (including the leading /repos/... segment, excluding the
// query string), and returns a counter of total requests received.
func newFakeGitHub(t *testing.T, fixtures map[string]pathFixture) (*httptest.Server, *int32) {
	t.Helper()
	var calls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)

		if got := r.Header.Get("User-Agent"); got == "" {
			t.Errorf("fake GitHub: request for %s missing User-Agent header (GitHub requires one)", r.URL.Path)
		}
		if got, want := r.Header.Get("Accept"), "application/vnd.github.raw+json"; got != want {
			t.Errorf("fake GitHub: request for %s Accept header = %q, want %q", r.URL.Path, got, want)
		}

		fx, ok := fixtures[r.URL.Path]
		if !ok {
			t.Fatalf("fake GitHub: unexpected request for path %q", r.URL.Path)
		}

		status := fx.status
		if status == 0 {
			status = http.StatusOK
		}
		w.WriteHeader(status)
		if status == http.StatusOK {
			w.Write([]byte(fx.body))
		}
	}))
	return server, &calls
}

// newTestRouter wires both resume routes into a real gin router, matching
// how projects_test.go tests its handler.
func newTestRouter(h *Handler) *gin.Engine {
	r := gin.New()
	r.GET("/api/v1/resume", h.GetResume)
	r.GET("/api/v1/resume/:variant", h.GetResumeVariant)
	return r
}

func getResume(t *testing.T, router *gin.Engine, path string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

const testToken = "resume-test-token"

func testCfg() config.Config {
	return config.Config{ResumeGHToken: testToken}
}

// contentsPath returns the fake server's request path for variant, matching
// what fetchVariant builds (everything except the base URL and query
// string).
func contentsPath(variant string) string {
	return "/repos/alcash55/Resume/contents/" + variants[variant]
}

// --- variant routing ---

// TestGetResume_DefaultsToFullstack proves GET /api/v1/resume (no :variant)
// serves the fullstack PDF, per the interface contract.
func TestGetResume_DefaultsToFullstack(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("fullstack"): {body: "%PDF-fullstack"},
	})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/resume: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got, want := rec.Body.String(), "%PDF-fullstack"; got != want {
		t.Errorf("GET /api/v1/resume: body = %q, want %q", got, want)
	}
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Errorf("GET /api/v1/resume: upstream calls = %d, want 1", got)
	}
}

// TestGetResumeVariant_EachValidVariant proves each of the three contract
// variants routes to its own PDF, from its own path in the Resume repo.
func TestGetResumeVariant_EachValidVariant(t *testing.T) {
	for _, variant := range []string{"fullstack", "frontend", "backend"} {
		t.Run(variant, func(t *testing.T) {
			wantBody := "%PDF-" + variant
			server, _ := newFakeGitHub(t, map[string]pathFixture{
				contentsPath(variant): {body: wantBody},
			})
			defer server.Close()

			h := New(testCfg(), WithBaseURL(server.URL))
			router := newTestRouter(h)

			rec := getResume(t, router, "/api/v1/resume/"+variant)
			if rec.Code != http.StatusOK {
				t.Fatalf("GET /api/v1/resume/%s: status = %d, want %d; body: %s", variant, rec.Code, http.StatusOK, rec.Body.String())
			}
			if got := rec.Body.String(); got != wantBody {
				t.Errorf("GET /api/v1/resume/%s: body = %q, want %q", variant, got, wantBody)
			}
		})
	}
}

// TestGetResumeVariant_UnknownVariant_404 proves a :variant outside
// fullstack/frontend/backend gets 404 with the JSON error shape, and never
// reaches the upstream at all.
func TestGetResumeVariant_UnknownVariant_404(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	for _, variant := range []string{"executive", "Fullstack", "full-stack"} {
		t.Run(variant, func(t *testing.T) {
			rec := getResume(t, router, "/api/v1/resume/"+url.PathEscape(variant))
			if rec.Code != http.StatusNotFound {
				t.Fatalf("GET /api/v1/resume/%s: status = %d, want %d; body: %s", variant, rec.Code, http.StatusNotFound, rec.Body.String())
			}
			const wantBody = `{"error":"unknown resume variant"}`
			if got := rec.Body.String(); got != wantBody {
				t.Errorf("GET /api/v1/resume/%s: body = %q, want %q", variant, got, wantBody)
			}
		})
	}
	if got := atomic.LoadInt32(calls); got != 0 {
		t.Errorf("upstream calls for unknown variants: got %d, want 0 (should be rejected before any fetch)", got)
	}
}

// --- response headers ---

// TestGetResume_Headers proves a success response carries every header the
// interface contract requires.
func TestGetResume_Headers(t *testing.T) {
	server, _ := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("backend"): {body: "%PDF-backend"},
	})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume/backend")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	if got, want := rec.Header().Get("Content-Type"), "application/pdf"; got != want {
		t.Errorf("Content-Type = %q, want %q", got, want)
	}
	if got, want := rec.Header().Get("Content-Disposition"), `inline; filename="Alex-Cash-Resume-backend.pdf"`; got != want {
		t.Errorf("Content-Disposition = %q, want %q", got, want)
	}
	if got := rec.Header().Get("Cache-Control"); !strings.Contains(got, "max-age=") {
		t.Errorf("Cache-Control = %q, want it to set a max-age (short browser cache, per the interface contract)", got)
	}
}

// --- caching ---

// TestGetResume_CacheHit_NoAdditionalUpstreamCalls proves a second request
// within the TTL is served entirely from cache.
func TestGetResume_CacheHit_NoAdditionalUpstreamCalls(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("fullstack"): {body: "%PDF-v1"},
	})
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	rec1 := getResume(t, router, "/api/v1/resume")
	if rec1.Code != http.StatusOK {
		t.Fatalf("first request: status = %d, want %d; body: %s", rec1.Code, http.StatusOK, rec1.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("upstream calls after first request: got %d, want 1", got)
	}

	rec2 := getResume(t, router, "/api/v1/resume")
	if rec2.Code != http.StatusOK {
		t.Fatalf("second request: status = %d, want %d; body: %s", rec2.Code, http.StatusOK, rec2.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Errorf("upstream calls after second (within-TTL) request: got %d, want still 1 (cache hit)", got)
	}
	if rec1.Body.String() != rec2.Body.String() {
		t.Errorf("cache hit returned a different body than the original fetch:\nfirst:  %s\nsecond: %s", rec1.Body.String(), rec2.Body.String())
	}
}

// TestGetResume_CacheExpiry_Refetches proves that once the injected clock
// advances past the 10-minute TTL, the next request triggers a fresh fetch.
func TestGetResume_CacheExpiry_Refetches(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("fullstack"): {body: "%PDF-v1"},
	})
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	getResume(t, router, "/api/v1/resume")
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("upstream calls after first request: got %d, want 1", got)
	}

	// Still within the 10m TTL: no refetch.
	clock.Advance(9 * time.Minute)
	getResume(t, router, "/api/v1/resume")
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("upstream calls after advancing 9m (TTL=10m): got %d, want still 1", got)
	}

	// Past the TTL: refetch.
	clock.Advance(2 * time.Minute)
	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("request after TTL expiry: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Errorf("upstream calls after advancing past the 10m TTL: got %d, want 2 (a fresh fetch should have happened)", got)
	}
}

// TestGetResume_VariantsCacheIndependently proves fetching one variant does
// not populate, or get served from, another variant's cache.
func TestGetResume_VariantsCacheIndependently(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("fullstack"): {body: "%PDF-fullstack"},
		contentsPath("frontend"):  {body: "%PDF-frontend"},
	})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	getResume(t, router, "/api/v1/resume/fullstack")
	getResume(t, router, "/api/v1/resume/frontend")
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Fatalf("upstream calls after fetching two distinct variants: got %d, want 2 (each variant fetched once)", got)
	}

	// Both re-requested within TTL: still 2 total, not 4.
	getResume(t, router, "/api/v1/resume/fullstack")
	getResume(t, router, "/api/v1/resume/frontend")
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Errorf("upstream calls after re-requesting both within TTL: got %d, want still 2", got)
	}
}

// TestGetResume_StaleOnFailure primes the cache with a good fetch, expires
// it, then makes the upstream fail entirely, and asserts the handler serves
// the previously cached PDF rather than a 502 - old data beats no data, and
// this is also what covers a GitHub outage per the interface contract.
func TestGetResume_StaleOnFailure(t *testing.T) {
	var fail atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("%PDF-good"))
	}))
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	primeRec := getResume(t, router, "/api/v1/resume")
	if primeRec.Code != http.StatusOK || primeRec.Body.String() != "%PDF-good" {
		t.Fatalf("priming request: status = %d, body = %q, want 200 and %q", primeRec.Code, primeRec.Body.String(), "%PDF-good")
	}

	clock.Advance(11 * time.Minute) // past the 10m TTL
	fail.Store(true)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("request with expired cache + failing upstream: status = %d, want %d (stale data, not 502); body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := rec.Body.String(); got != "%PDF-good" {
		t.Errorf("request with expired cache + failing upstream: body = %q, want the previously-cached PDF %q", got, "%PDF-good")
	}
}

// TestGetResume_ColdCacheUpstreamFailure_502 proves that with nothing ever
// cached and a failing upstream, the handler returns 502 with the stable
// error body - and the token must never appear anywhere in the response.
func TestGetResume_ColdCacheUpstreamFailure_502(t *testing.T) {
	server, _ := newFakeGitHub(t, map[string]pathFixture{
		contentsPath("fullstack"): {status: http.StatusInternalServerError},
	})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("cold cache + failing upstream: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	const wantBody = `{"error":"could not load resume"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("cold cache + failing upstream: body = %q, want %q", got, wantBody)
	}
	if strings.Contains(rec.Body.String(), testToken) {
		t.Errorf("cold cache + failing upstream: response body leaked the token. Got: %s", rec.Body.String())
	}
}

// TestGetResume_NoTokenConfigured_502WithoutCallingUpstream pins the state
// the endpoint is in until Alex runs scripts/resume-token-wizard.sh: no
// RESUME_GH_TOKEN, no cached data yet, so every request is a 502, and the
// handler never bothers dialing a private repo it has no credential for.
func TestGetResume_NoTokenConfigured_502WithoutCallingUpstream(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]pathFixture{})
	defer server.Close()

	cfg := config.Config{ResumeGHToken: ""}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("no token configured: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	const wantBody = `{"error":"could not load resume"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("no token configured: body = %q, want %q", got, wantBody)
	}
	if got := atomic.LoadInt32(calls); got != 0 {
		t.Errorf("upstream calls with no token configured: got %d, want 0 (a private repo with no credential can only fail)", got)
	}
}

// --- Authorization header ---

// TestGetResume_AuthorizationHeader proves the Bearer token is sent on every
// request, since (unlike internal/handlers/projects) there is no
// unauthenticated path for a private repo.
func TestGetResume_AuthorizationHeader(t *testing.T) {
	var gotHeader string
	var headerPresent bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotHeader = r.Header.Get("Authorization")
		_, headerPresent = r.Header["Authorization"]
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("%PDF-v1"))
	}))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if !headerPresent {
		t.Fatal("Authorization header absent, want present")
	}
	if want := "Bearer " + testToken; gotHeader != want {
		t.Errorf("Authorization header = %q, want %q", gotHeader, want)
	}
}

// --- hung upstream ---

// TestGetResume_HungUpstreamDoesNotHangTheEndpoint proves a hung upstream
// request eventually resolves with a 502 rather than blocking indefinitely,
// thanks to the client's timeout.
func TestGetResume_HungUpstreamDoesNotHangTheEndpoint(t *testing.T) {
	const (
		clientTimeout = 20 * time.Millisecond
		serverDelay   = 300 * time.Millisecond // far longer than clientTimeout, finite so Close() can return
	)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(serverDelay)
	}))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL), WithHTTPClient(&http.Client{Timeout: clientTimeout}))
	router := newTestRouter(h)

	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- getResume(t, router, "/api/v1/resume") }()

	select {
	case rec := <-done:
		if rec.Code != http.StatusBadGateway {
			t.Errorf("hung upstream: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("GetResume did not return within 2s of a hung upstream - the client timeout did not bound the request")
	}
}

// --- single-flight ---

// TestGetResume_SingleFlight_ColdCache drives many concurrent requests at a
// cold cache and proves they collapse onto exactly one upstream fetch, not
// one per concurrent HTTP request.
func TestGetResume_SingleFlight_ColdCache(t *testing.T) {
	const concurrency = 20
	gate := make(chan struct{})
	var calls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		<-gate
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("%PDF-v1"))
	}))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, concurrency)
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			recs[i] = getResume(t, router, "/api/v1/resume")
		}(i)
	}

	deadline := time.After(2 * time.Second)
	for {
		if atomic.LoadInt32(&calls) >= 1 {
			break
		}
		select {
		case <-deadline:
			t.Fatal("timed out waiting for the leader's upstream request to start")
		case <-time.After(time.Millisecond):
		}
	}
	close(gate)
	wg.Wait()

	for i, rec := range recs {
		if rec.Code != http.StatusOK {
			t.Errorf("concurrent request #%d: status = %d, want %d; body: %s", i, rec.Code, http.StatusOK, rec.Body.String())
		}
	}
	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("upstream calls after %d concurrent cold-cache requests: got %d, want 1 (single-flighted across all %d callers)", concurrency, got, concurrency)
	}
}
