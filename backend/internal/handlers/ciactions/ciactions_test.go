package ciactions

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
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

const (
	treePath = "/repos/alcash55/ac-composite-actions/git/trees/main"
	rawRoot  = "/alcash55/ac-composite-actions/main/"
)

// --- fixtures and helpers ---

type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func newFakeClock() *fakeClock { return &fakeClock{now: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)} }

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

// fakeGitHub stands in for both api.github.com (the tree) and
// raw.githubusercontent.com (each action's YAML). Tests change what it serves
// between requests through set.
type fakeGitHub struct {
	*httptest.Server

	mu         sync.Mutex
	sha        string
	files      map[string]string // repo path -> file contents; the tree lists exactly these
	treeStatus int               // 0 means 200
	treeBody   string            // when set, served instead of the generated tree

	treeCalls  int32
	rawCalls   int32
	treeAuth   []string // Authorization header of each tree request, "" when absent
	rawAuth    []string
	rawMissing map[string]bool // repo paths that answer 404
}

func newFakeGitHub(t *testing.T, files map[string]string) *fakeGitHub {
	t.Helper()
	f := &fakeGitHub{sha: "sha-1", files: files, rawMissing: map[string]bool{}}
	f.Server = httptest.NewServer(http.HandlerFunc(f.serve))
	t.Cleanup(f.Close)
	return f
}

func (f *fakeGitHub) set(fn func(f *fakeGitHub)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	fn(f)
}

func (f *fakeGitHub) serve(w http.ResponseWriter, r *http.Request) {
	f.mu.Lock()
	defer f.mu.Unlock()

	switch {
	case r.URL.Path == treePath:
		atomic.AddInt32(&f.treeCalls, 1)
		f.treeAuth = append(f.treeAuth, r.Header.Get("Authorization"))
		if r.URL.Query().Get("recursive") != "1" {
			http.Error(w, "recursive=1 missing", http.StatusBadRequest)
			return
		}
		if f.treeStatus != 0 && f.treeStatus != http.StatusOK {
			// A stale token is rejected only when it is sent.
			if (f.treeStatus == http.StatusUnauthorized || f.treeStatus == http.StatusForbidden) && r.Header.Get("Authorization") == "" {
				// served below
			} else {
				w.WriteHeader(f.treeStatus)
				return
			}
		}
		w.Header().Set("Content-Type", "application/json")
		if f.treeBody != "" {
			w.Write([]byte(f.treeBody))
			return
		}
		entries := []treeEntry{}
		for p := range f.files {
			entries = append(entries, treeEntry{Path: p, Type: "blob"})
		}
		json.NewEncoder(w).Encode(githubTree{SHA: f.sha, Tree: entries})
	case strings.HasPrefix(r.URL.Path, rawRoot):
		atomic.AddInt32(&f.rawCalls, 1)
		f.rawAuth = append(f.rawAuth, r.Header.Get("Authorization"))
		repoPath := strings.TrimPrefix(r.URL.Path, rawRoot)
		body, ok := f.files[repoPath]
		if !ok || f.rawMissing[repoPath] {
			http.NotFound(w, r)
			return
		}
		w.Write([]byte(body))
	default:
		http.NotFound(w, r)
	}
}

func newTestHandler(f *fakeGitHub, cfg config.Config, opts ...Option) *Handler {
	base := []Option{WithBaseURL(f.URL), WithRawBaseURL(f.URL)}
	return New(cfg, append(base, opts...)...)
}

func getCIActions(t *testing.T, h *Handler) *httptest.ResponseRecorder {
	t.Helper()
	r := gin.New()
	r.GET("/api/v1/ci-actions", h.GetCIActions)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/ci-actions", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func decode(t *testing.T, rec *httptest.ResponseRecorder) response {
	t.Helper()
	var resp response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding body: %v\nbody: %s", err, rec.Body.String())
	}
	return resp
}

func actionNames(resp response) []string {
	out := []string{}
	for _, a := range resp.Actions {
		out = append(out, a.Name)
	}
	return out
}

func yamlWith(description string) string {
	return "name: x\ndescription: " + description + "\nruns:\n  using: composite\n"
}

func captureLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prevOutput, prevFlags := log.Writer(), log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	t.Cleanup(func() {
		log.SetOutput(prevOutput)
		log.SetFlags(prevFlags)
	})
	return &buf
}

func equal(a, b []string) bool {
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

// --- tests ---

// TestGetCIActions_ReturnsEveryActionWithItsFirstSentence pins the wire
// contract the frontend renders: the same shape the build-time script wrote
// to src/generated/ciActions.ts (actions + treeSha) plus the stale flag.
func TestGetCIActions_ReturnsEveryActionWithItsFirstSentence(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{
		"README.md":                        "# hi",
		"diff/action.yml":                  "name: diff\ndescription: >\n  List the files changed in a pull request, split into\n  files that can be processed. And more.\n",
		"ats-check/action.yml":             yamlWith("Parse a resume PDF and score its ATS compatibility"),
		"security/betterleaks/action.yaml": yamlWith("Scan PR commits. Then more."),
		"node_modules/dep/action.yml":      yamlWith("Vendored."),
		".github/actions/local/action.yml": yamlWith("Repo tooling."),
		"diff/index.js":                    "// not an action file",
	})
	h := newTestHandler(f, config.Config{})

	rec := getCIActions(t, h)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}

	want := `{"actions":[` +
		`{"name":"ats-check","description":"Parse a resume PDF and score its ATS compatibility"},` +
		`{"name":"diff","description":"List the files changed in a pull request, split into files that can be processed."},` +
		`{"name":"security/betterleaks","description":"Scan PR commits."}` +
		`],"treeSha":"sha-1","stale":false}`
	if got := rec.Body.String(); got != want {
		t.Errorf("body mismatch\n got: %s\nwant: %s", got, want)
	}
}

func TestGetCIActions_ActionWithoutDescriptionStillListed(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{
		"a/action.yml": yamlWith("Does a."),
		"b/action.yml": "name: b\n",
		"c/action.yml": yamlWith("Does c."),
	})
	f.set(func(f *fakeGitHub) { f.rawMissing["c/action.yml"] = true })
	h := newTestHandler(f, config.Config{})
	logs := captureLog(t)

	rec := getCIActions(t, h)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (one unreadable action file must not fail the list); body: %s", rec.Code, rec.Body.String())
	}
	resp := decode(t, rec)
	if !equal(actionNames(resp), []string{"a", "b", "c"}) {
		t.Fatalf("names = %v, want [a b c]", actionNames(resp))
	}
	if resp.Actions[1].Description != "" || resp.Actions[2].Description != "" {
		t.Errorf("descriptions = %q, %q, want both empty (no description / 404)", resp.Actions[1].Description, resp.Actions[2].Description)
	}
	if !strings.Contains(logs.String(), "c/action.yml") {
		t.Errorf("log = %q, want the unreadable file named", logs.String())
	}
}

func TestGetCIActions_NotATree_502(t *testing.T) {
	f := newFakeGitHub(t, nil)
	f.set(func(f *fakeGitHub) { f.treeBody = `{"message":"API rate limit exceeded"}` })
	h := newTestHandler(f, config.Config{})

	rec := getCIActions(t, h)
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status = %d, want 502 so an error page never becomes an empty list; body: %s", rec.Code, rec.Body.String())
	}
	if want := `{"error":"could not load ci actions"}`; rec.Body.String() != want {
		t.Errorf("body = %s, want %s", rec.Body.String(), want)
	}
}

func TestGetCIActions_RepoWithNoActions_502(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"README.md": "x", "node_modules/a/action.yml": "x"})
	h := newTestHandler(f, config.Config{})

	if rec := getCIActions(t, h); rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502 when the repo lists no actions; body: %s", rec.Code, rec.Body.String())
	}
}

func TestGetCIActions_UpstreamError_502(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	f.set(func(f *fakeGitHub) { f.treeStatus = http.StatusInternalServerError })
	h := newTestHandler(f, config.Config{})

	if rec := getCIActions(t, h); rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502; body: %s", rec.Code, rec.Body.String())
	}
}

func TestGetCIActions_CacheHit_NoAdditionalUpstreamCalls(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	clk := newFakeClock()
	h := newTestHandler(f, config.Config{}, WithNow(clk.Now))

	getCIActions(t, h)
	clk.Advance(cacheTTL - time.Second)
	getCIActions(t, h)

	if got := atomic.LoadInt32(&f.treeCalls); got != 1 {
		t.Errorf("tree calls = %d, want 1", got)
	}
	if got := atomic.LoadInt32(&f.rawCalls); got != 1 {
		t.Errorf("raw calls = %d, want 1", got)
	}
}

// Ported from the script's "picks up an action that is added and drops one
// that is removed".
func TestGetCIActions_CacheExpiry_PicksUpAddedAndDropsRemoved(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A."), "b/action.yml": yamlWith("B.")})
	clk := newFakeClock()
	h := newTestHandler(f, config.Config{}, WithNow(clk.Now))

	getCIActions(t, h)
	f.set(func(f *fakeGitHub) {
		f.sha = "sha-2"
		f.files = map[string]string{"b/action.yml": yamlWith("B."), "c/action.yml": yamlWith("C.")}
	})
	clk.Advance(cacheTTL)

	resp := decode(t, getCIActions(t, h))
	if !equal(actionNames(resp), []string{"b", "c"}) {
		t.Errorf("names after refresh = %v, want [b c]", actionNames(resp))
	}
	if resp.TreeSHA != "sha-2" || resp.Stale {
		t.Errorf("treeSha = %q, stale = %v, want sha-2 and false", resp.TreeSHA, resp.Stale)
	}
}

// Ported from "keeps the last good file when GitHub cannot be reached".
func TestGetCIActions_StaleOnFailure(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	clk := newFakeClock()
	h := newTestHandler(f, config.Config{}, WithNow(clk.Now))
	captureLog(t)

	first := decode(t, getCIActions(t, h))
	f.set(func(f *fakeGitHub) { f.treeStatus = http.StatusServiceUnavailable })
	clk.Advance(cacheTTL + time.Minute)

	rec := getCIActions(t, h)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 from stale data; body: %s", rec.Code, rec.Body.String())
	}
	resp := decode(t, rec)
	if !resp.Stale {
		t.Error("stale = false, want true")
	}
	if !equal(actionNames(resp), actionNames(first)) || resp.TreeSHA != first.TreeSHA {
		t.Errorf("stale body = %+v, want the earlier %+v", resp, first)
	}
}

func TestGetCIActions_SingleFlight_ColdCache(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A."), "b/action.yml": yamlWith("B.")})
	h := newTestHandler(f, config.Config{})

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if rec := getCIActions(t, h); rec.Code != http.StatusOK {
				t.Errorf("status = %d, want 200", rec.Code)
			}
		}()
	}
	wg.Wait()

	if got := atomic.LoadInt32(&f.treeCalls); got != 1 {
		t.Errorf("tree calls for 20 concurrent cold requests = %d, want 1", got)
	}
	if got := atomic.LoadInt32(&f.rawCalls); got != 2 {
		t.Errorf("raw calls = %d, want 2 (one per action, once)", got)
	}
}

func TestGetCIActions_TokenSentToTheAPIOnly(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	h := newTestHandler(f, config.Config{GHToken: "sekrit-token"})

	if rec := getCIActions(t, h); rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body.String())
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.treeAuth) != 1 || f.treeAuth[0] != "Bearer sekrit-token" {
		t.Errorf("tree Authorization = %q, want [Bearer sekrit-token]", f.treeAuth)
	}
	for _, got := range f.rawAuth {
		if got != "" {
			t.Errorf("raw host got Authorization %q, want none: the raw files are public and the token should not leave the API host", got)
		}
	}
}

func TestGetCIActions_NoTokenSendsNoAuthorizationHeader(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	h := newTestHandler(f, config.Config{})

	getCIActions(t, h)
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.treeAuth) != 1 || f.treeAuth[0] != "" {
		t.Errorf("tree Authorization = %q, want [\"\"] (header absent)", f.treeAuth)
	}
}

func TestGetCIActions_RejectedToken_RetriesUnauthenticatedAndNeverLogsIt(t *testing.T) {
	for _, status := range []int{http.StatusUnauthorized, http.StatusForbidden} {
		t.Run(http.StatusText(status), func(t *testing.T) {
			f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
			f.set(func(f *fakeGitHub) { f.treeStatus = status })
			h := newTestHandler(f, config.Config{GHToken: "sekrit-token"})
			logs := captureLog(t)

			rec := getCIActions(t, h)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 after the unauthenticated retry; body: %s", rec.Code, rec.Body.String())
			}
			if got := atomic.LoadInt32(&f.treeCalls); got != 2 {
				t.Errorf("tree calls = %d, want 2 (authenticated, then one unauthenticated retry)", got)
			}
			if strings.Contains(logs.String(), "sekrit-token") || strings.Contains(rec.Body.String(), "sekrit-token") {
				t.Error("token leaked into the log or the response")
			}
		})
	}
}

func TestGetCIActions_Upstream500NotRetried(t *testing.T) {
	f := newFakeGitHub(t, map[string]string{"a/action.yml": yamlWith("A.")})
	f.set(func(f *fakeGitHub) { f.treeStatus = http.StatusInternalServerError })
	h := newTestHandler(f, config.Config{GHToken: "sekrit-token"})
	captureLog(t)

	getCIActions(t, h)
	if got := atomic.LoadInt32(&f.treeCalls); got != 1 {
		t.Errorf("tree calls = %d, want 1 (a 500 is not a credential problem)", got)
	}
}

func TestGetCIActions_HungUpstreamDoesNotHangTheEndpoint(t *testing.T) {
	const (
		clientTimeout = 20 * time.Millisecond
		serverDelay   = 300 * time.Millisecond
	)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(serverDelay)
	}))
	defer server.Close()
	h := New(config.Config{}, WithBaseURL(server.URL), WithRawBaseURL(server.URL), WithHTTPClient(&http.Client{Timeout: clientTimeout}))
	captureLog(t)

	done := make(chan *httptest.ResponseRecorder, 1)
	go func() { done <- getCIActions(t, h) }()

	select {
	case rec := <-done:
		if rec.Code != http.StatusBadGateway {
			t.Errorf("status = %d, want 502", rec.Code)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("endpoint did not return within 2s of a hung upstream")
	}
}

func TestGetCIActions_ErrorBodyHidesUpstreamDetail(t *testing.T) {
	f := newFakeGitHub(t, nil)
	f.set(func(f *fakeGitHub) { f.treeStatus = http.StatusInternalServerError })
	h := newTestHandler(f, config.Config{GHToken: "sekrit-token"})
	captureLog(t)

	rec := getCIActions(t, h)
	if strings.Contains(rec.Body.String(), f.URL) || strings.Contains(rec.Body.String(), "sekrit-token") {
		t.Errorf("error body %s leaks an upstream URL or the token", rec.Body.String())
	}
}
