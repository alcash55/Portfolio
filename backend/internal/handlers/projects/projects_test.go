package projects

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path"
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
// instead of sleeping, matching internal/ratelimit's pattern.
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

// repoFixture describes how a fake GitHub server should respond for one repo
// name.
type repoFixture struct {
	status int // defaults to http.StatusOK when zero
	body   githubRepo
}

// newFakeGitHub builds an httptest server that serves fixtures keyed by repo
// name (the last path segment of /repos/{owner}/{name}), and returns a
// counter of total requests received across all repos.
func newFakeGitHub(t *testing.T, fixtures map[string]repoFixture) (*httptest.Server, *int32) {
	t.Helper()
	var calls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)

		if got := r.Header.Get("User-Agent"); got == "" {
			t.Errorf("fake GitHub: request for %s missing User-Agent header (GitHub requires one)", r.URL.Path)
		}
		if got, want := r.Header.Get("Accept"), "application/vnd.github+json"; got != want {
			t.Errorf("fake GitHub: request for %s Accept header = %q, want %q", r.URL.Path, got, want)
		}

		name := path.Base(r.URL.Path)
		fx, ok := fixtures[name]
		if !ok {
			t.Fatalf("fake GitHub: unexpected request for repo %q (path %s)", name, r.URL.Path)
		}

		status := fx.status
		if status == 0 {
			status = http.StatusOK
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		if status == http.StatusOK {
			if err := json.NewEncoder(w).Encode(fx.body); err != nil {
				t.Fatalf("fake GitHub: encoding response for %s: %v", name, err)
			}
		}
	}))
	return server, &calls
}

// newTestRouter wires GetProjects into a real gin router, matching how
// contact_test.go tests its handler.
func newTestRouter(h *Handler) *gin.Engine {
	r := gin.New()
	r.GET("/api/v1/projects", h.GetProjects)
	return r
}

func getProjects(t *testing.T, router *gin.Engine) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/projects", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func decodeResponse(t *testing.T, rec *httptest.ResponseRecorder) response {
	t.Helper()
	var resp response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding response body: %v\nbody: %s", err, rec.Body.String())
	}
	return resp
}

// --- happy path & shape ---

// TestGetProjects_OrderMatchesAllowListNotResponseOrder pins the contract's
// ordering rule: the response order comes from cfg.ProjectRepos, not from
// whichever repo's HTTP round-trip happens to finish first. The fake server
// is deliberately wired (via channels, not sleeps) to finish requests in the
// reverse of allow-list order.
func TestGetProjects_OrderMatchesAllowListNotResponseOrder(t *testing.T) {
	bServed := make(chan struct{})
	cServed := make(chan struct{})

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := path.Base(r.URL.Path)
		switch name {
		case "Repo-A":
			<-bServed // A waits for B
		case "Repo-B":
			<-cServed // B waits for C
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(githubRepo{Name: name, HTMLURL: "https://github.com/alcash55/" + name})

		switch name {
		case "Repo-B":
			close(bServed)
		case "Repo-C":
			close(cServed)
		}
	}))
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Repo-A", "Repo-B", "Repo-C"}}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getProjects(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("GET /api/v1/projects: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	resp := decodeResponse(t, rec)
	var gotNames []string
	for _, p := range resp.Projects {
		gotNames = append(gotNames, p.Name)
	}
	want := []string{"Repo-A", "Repo-B", "Repo-C"}
	if !equalStrings(gotNames, want) {
		t.Errorf("response project order = %v, want %v (allow-list order, despite C completing first, then B, then A)", gotNames, want)
	}
}

func equalStrings(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// TestGetProjects_NullFieldsBecomeContractDefaults proves GitHub's null
// description/homepage/language become "" and a null topics array becomes
// [], never null - the interface contract is explicit that the frontend
// must never see null for these fields.
func TestGetProjects_NullFieldsBecomeContractDefaults(t *testing.T) {
	server, _ := newFakeGitHub(t, map[string]repoFixture{
		"Little-Town": {body: githubRepo{
			Name:            "Little-Town",
			HTMLURL:         "https://github.com/alcash55/Little-Town",
			Description:     nil,
			Homepage:        nil,
			Language:        nil,
			Topics:          nil,
			StargazersCount: 3,
			UpdatedAt:       time.Date(2026, 8, 1, 12, 0, 0, 0, time.UTC),
		}},
	})
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Little-Town"}}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getProjects(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	// Assert against the raw JSON, not just the decoded struct, so a
	// null-vs-omitted regression in the JSON tags would actually be caught.
	body := rec.Body.String()
	for _, want := range []string{`"description":""`, `"homepage":""`, `"language":""`, `"topics":[]`} {
		if !strings.Contains(body, want) {
			t.Errorf("response body does not contain %q (null-from-GitHub fields must become contract defaults, never null) - got: %s", want, body)
		}
	}

	resp := decodeResponse(t, rec)
	if resp.Projects[0].Topics == nil {
		t.Error("resp.Projects[0].Topics is nil, want a non-nil empty slice")
	}
}

// --- caching ---

func fixture(name string) repoFixture {
	return repoFixture{body: githubRepo{
		Name:      name,
		HTMLURL:   "https://github.com/alcash55/" + name,
		UpdatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}}
}

// TestGetProjects_CacheHit_NoAdditionalUpstreamCalls proves a second request
// within the TTL is served entirely from cache: zero additional upstream
// calls.
func TestGetProjects_CacheHit_NoAdditionalUpstreamCalls(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]repoFixture{
		"Little-Town": fixture("Little-Town"),
		"Portfolio":   fixture("Portfolio"),
	})
	defer server.Close()

	clock := newFakeClock(time.Now())
	cfg := config.Config{ProjectRepos: []string{"Little-Town", "Portfolio"}}
	h := New(cfg, WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	rec1 := getProjects(t, router)
	if rec1.Code != http.StatusOK {
		t.Fatalf("first request: status = %d, want %d; body: %s", rec1.Code, http.StatusOK, rec1.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Fatalf("upstream calls after first request: got %d, want 2 (one per repo)", got)
	}

	rec2 := getProjects(t, router)
	if rec2.Code != http.StatusOK {
		t.Fatalf("second request: status = %d, want %d; body: %s", rec2.Code, http.StatusOK, rec2.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Errorf("upstream calls after second (within-TTL) request: got %d, want still 2 (cache hit, zero additional upstream calls)", got)
	}
	if rec1.Body.String() != rec2.Body.String() {
		t.Errorf("cache hit returned different body than the original fetch:\nfirst:  %s\nsecond: %s", rec1.Body.String(), rec2.Body.String())
	}
}

// TestGetProjects_CacheExpiry_Refetches proves that once the injected clock
// advances past the TTL, the next request triggers a fresh upstream fetch.
func TestGetProjects_CacheExpiry_Refetches(t *testing.T) {
	server, calls := newFakeGitHub(t, map[string]repoFixture{
		"Little-Town": fixture("Little-Town"),
	})
	defer server.Close()

	clock := newFakeClock(time.Now())
	cfg := config.Config{ProjectRepos: []string{"Little-Town"}}
	h := New(cfg, WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	getProjects(t, router)
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("upstream calls after first request: got %d, want 1", got)
	}

	// Still within the 1h TTL: no refetch.
	clock.Advance(59 * time.Minute)
	getProjects(t, router)
	if got := atomic.LoadInt32(calls); got != 1 {
		t.Fatalf("upstream calls after advancing 59m (TTL=1h): got %d, want still 1", got)
	}

	// Past the TTL: refetch.
	clock.Advance(2 * time.Minute)
	rec := getProjects(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("request after TTL expiry: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := atomic.LoadInt32(calls); got != 2 {
		t.Errorf("upstream calls after advancing past the 1h TTL: got %d, want 2 (a fresh fetch should have happened)", got)
	}
}

// TestGetProjects_SingleFlight_ColdCache drives many concurrent requests at
// a cold cache and proves they collapse onto exactly one upstream fetch per
// repo, not one per concurrent HTTP request. The fake server blocks every
// response on a gate so all callers are guaranteed to overlap while the
// leader's fetch is in flight, forcing the follower-wait path to actually
// run rather than the test passing vacuously.
func TestGetProjects_SingleFlight_ColdCache(t *testing.T) {
	const concurrency = 20
	gate := make(chan struct{})
	var calls int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		<-gate
		name := path.Base(r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(githubRepo{Name: name, HTMLURL: "https://github.com/alcash55/" + name})
	}))
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Little-Town", "Portfolio"}}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	var wg sync.WaitGroup
	recs := make([]*httptest.ResponseRecorder, concurrency)
	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			recs[i] = getProjects(t, router)
		}(i)
	}

	// Give every goroutine a chance to reach the fake server and block on
	// the gate before releasing it, so the single-flight follower path is
	// actually exercised rather than requests running one at a time.
	deadline := time.After(2 * time.Second)
	for {
		if atomic.LoadInt32(&calls) >= 2 { // one per repo is enough to know the leader is mid-flight
			break
		}
		select {
		case <-deadline:
			t.Fatal("timed out waiting for the leader's upstream requests to start")
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
	if got := atomic.LoadInt32(&calls); got != 2 {
		t.Errorf("upstream calls after %d concurrent cold-cache requests: got %d, want 2 (one per repo, single-flighted across all %d callers)", concurrency, got, concurrency)
	}
}

// TestGetProjects_StaleOnFailure primes the cache with a good fetch, expires
// it, then makes the upstream fail entirely, and asserts the handler serves
// the old data with stale:true rather than a 502 - old data beats no data.
func TestGetProjects_StaleOnFailure(t *testing.T) {
	var fail atomic.Bool
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		name := path.Base(r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(githubRepo{Name: name, HTMLURL: "https://github.com/alcash55/" + name, StargazersCount: 7})
	}))
	defer server.Close()

	clock := newFakeClock(time.Now())
	cfg := config.Config{ProjectRepos: []string{"Little-Town"}}
	h := New(cfg, WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	primeRec := getProjects(t, router)
	if primeRec.Code != http.StatusOK {
		t.Fatalf("priming request: status = %d, want %d; body: %s", primeRec.Code, http.StatusOK, primeRec.Body.String())
	}
	primed := decodeResponse(t, primeRec)
	if primed.Stale {
		t.Fatalf("priming request: stale = true, want false")
	}

	clock.Advance(2 * time.Hour) // past the 1h TTL
	fail.Store(true)

	rec := getProjects(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("request with expired cache + failing upstream: status = %d, want %d (stale data, not 502); body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	resp := decodeResponse(t, rec)
	if !resp.Stale {
		t.Errorf("request with expired cache + failing upstream: stale = false, want true")
	}
	if len(resp.Projects) != 1 || resp.Projects[0].Stars != 7 {
		t.Errorf("request with expired cache + failing upstream: projects = %+v, want the previously-cached data (stars=7) served as-is", resp.Projects)
	}
}

// TestGetProjects_ColdCacheUpstream401 pins today's real production state:
// GH_TOKEN is dead, so every repo request comes back 401. With nothing ever
// cached, that must surface as 502 with the stable error body - and the
// token must never appear anywhere in the response.
func TestGetProjects_ColdCacheUpstream401(t *testing.T) {
	const token = "ghp_definitelyASecretToken"
	server, _ := newFakeGitHub(t, map[string]repoFixture{
		"Little-Town": {status: http.StatusUnauthorized},
		"Portfolio":   {status: http.StatusUnauthorized},
	})
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Little-Town", "Portfolio"}, GHToken: token}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getProjects(t, router)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("cold cache + 401 from every repo: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	const wantBody = `{"error":"could not load projects"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("cold cache + 401 from every repo: body = %q, want %q", got, wantBody)
	}
	if strings.Contains(rec.Body.String(), token) {
		t.Errorf("cold cache + 401 from every repo: response body leaked the GH_TOKEN value — got: %s", rec.Body.String())
	}
}

// TestGetProjects_OneRepo404_SkipsThatRepo pins the decision (left to
// backend by the brief) for a single bad repo in the allow-list: skip it and
// serve everything that did load, in allow-list order, rather than failing
// the whole response. Partial data beats none, matching the stale-on-failure
// philosophy elsewhere in this handler.
func TestGetProjects_OneRepo404_SkipsThatRepo(t *testing.T) {
	server, _ := newFakeGitHub(t, map[string]repoFixture{
		"Little-Town":  fixture("Little-Town"),
		"Deleted-Repo": {status: http.StatusNotFound},
		"Portfolio":    fixture("Portfolio"),
	})
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Little-Town", "Deleted-Repo", "Portfolio"}}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getProjects(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("one repo 404s, others succeed: status = %d, want %d (partial success, not a failed response); body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	resp := decodeResponse(t, rec)
	var gotNames []string
	for _, p := range resp.Projects {
		gotNames = append(gotNames, p.Name)
	}
	want := []string{"Little-Town", "Portfolio"}
	if !equalStrings(gotNames, want) {
		t.Errorf("one repo 404s: projects = %v, want %v (the 404ing repo skipped, remaining repos in allow-list order)", gotNames, want)
	}
	if resp.Stale {
		t.Errorf("one repo 404s, others succeed: stale = true, want false (this is a successful fresh fetch, just a partial one)")
	}
}

// --- Authorization header ---

// TestGetProjects_AuthorizationHeader pins the exact rule from TEAM-BRIEF
// B2: sent only when the token is non-empty, and absent entirely (not just
// empty) when it is.
func TestGetProjects_AuthorizationHeader(t *testing.T) {
	t.Run("token configured", func(t *testing.T) {
		var gotHeader string
		var headerPresent bool
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			gotHeader = r.Header.Get("Authorization")
			_, headerPresent = r.Header["Authorization"]
			json.NewEncoder(w).Encode(githubRepo{Name: "Little-Town", HTMLURL: "https://github.com/alcash55/Little-Town"})
		}))
		defer server.Close()

		cfg := config.Config{ProjectRepos: []string{"Little-Town"}, GHToken: "sekrit-token"}
		h := New(cfg, WithBaseURL(server.URL))
		router := newTestRouter(h)

		rec := getProjects(t, router)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
		if !headerPresent {
			t.Fatal("Authorization header absent, want present when GHToken is configured")
		}
		if want := "Bearer sekrit-token"; gotHeader != want {
			t.Errorf("Authorization header = %q, want %q", gotHeader, want)
		}
	})

	t.Run("token empty", func(t *testing.T) {
		var headerPresent bool
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, headerPresent = r.Header["Authorization"]
			json.NewEncoder(w).Encode(githubRepo{Name: "Little-Town", HTMLURL: "https://github.com/alcash55/Little-Town"})
		}))
		defer server.Close()

		cfg := config.Config{ProjectRepos: []string{"Little-Town"}, GHToken: ""}
		h := New(cfg, WithBaseURL(server.URL))
		router := newTestRouter(h)

		rec := getProjects(t, router)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
		}
		if headerPresent {
			t.Error("Authorization header present with an empty GHToken, want it entirely absent (an empty bearer token is rejected by GitHub, whereas no header is a valid unauthenticated request)")
		}
	})
}

// TestGetProjects_HungUpstreamDoesNotHangTheEndpoint proves a hung repo
// request eventually resolves with a 502 rather than blocking the response
// indefinitely, thanks to the client's timeout. The fake server's delay is
// finite (just much longer than the client timeout) rather than an
// unclosed channel, so httptest.Server.Close - which blocks until in-flight
// handlers return - doesn't itself hang the test during cleanup.
func TestGetProjects_HungUpstreamDoesNotHangTheEndpoint(t *testing.T) {
	const (
		clientTimeout = 20 * time.Millisecond
		serverDelay   = 300 * time.Millisecond // far longer than clientTimeout, finite so Close() can return
	)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(serverDelay)
	}))
	defer server.Close()

	cfg := config.Config{ProjectRepos: []string{"Little-Town"}}
	h := New(cfg, WithBaseURL(server.URL), WithHTTPClient(&http.Client{Timeout: clientTimeout}))
	router := newTestRouter(h)

	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- getProjects(t, router) }()

	select {
	case rec := <-done:
		if rec.Code != http.StatusBadGateway {
			t.Errorf("hung upstream: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
		}
	case <-time.After(2 * time.Second):
		t.Fatal("GetProjects did not return within 2s of a hung upstream - the client timeout did not bound the request")
	}
}

// TestGetProjects_ConcurrentFetchesAreFaster proves the four-repo fetch
// happens concurrently, not sequentially: with each repo taking artificialDelay
// to respond, four sequential round-trips would take >= 4x artificialDelay,
// but concurrent ones complete in about 1x.
func TestGetProjects_ConcurrentFetchesAreFaster(t *testing.T) {
	const artificialDelay = 100 * time.Millisecond
	repos := []string{"Repo-A", "Repo-B", "Repo-C", "Repo-D"}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(artificialDelay)
		name := path.Base(r.URL.Path)
		json.NewEncoder(w).Encode(githubRepo{Name: name, HTMLURL: "https://github.com/alcash55/" + name})
	}))
	defer server.Close()

	cfg := config.Config{ProjectRepos: repos}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	start := time.Now()
	rec := getProjects(t, router)
	elapsed := time.Since(start)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	// Sequential would be ~4*artificialDelay (400ms); concurrent should stay
	// well under that. Generous budget to avoid flaking on a loaded CI box.
	if budget := artificialDelay * 3; elapsed > budget {
		t.Errorf("fetching %d repos took %v, want under %v (repos should be fetched concurrently, not sequentially)", len(repos), elapsed, budget)
	}
}
