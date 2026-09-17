package resume

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
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

// assetFixture describes how the fake asset-download endpoint should respond
// for one named asset.
type assetFixture struct {
	status int // defaults to http.StatusOK when zero
	body   string
}

// releaseFixture describes the fake "latest release" endpoint's response: its
// status (a 404 stands in for "no release published yet"), its tag, and the
// assets attached to it. A variant whose filename has no entry in assets
// simulates a release that shipped without that variant's PDF.
type releaseFixture struct {
	status int // defaults to http.StatusOK when zero
	tag    string
	assets map[string]assetFixture // keyed by asset filename, e.g. "fullstack.pdf"
}

// fakeGitHubCounts tracks how many times each fake endpoint was hit, so
// tests can pin the two-call shape of one fetch (latest release, then the
// asset it points at) and prove the cache/single-flight collapse both calls
// rather than just one.
type fakeGitHubCounts struct {
	release int32
	asset   int32
}

// newFakeGitHub builds an httptest server standing in for the two GitHub
// endpoints a fetch needs: releases/latest, and the per-asset download URL
// that release's JSON points at. It enforces the two request-shape
// requirements production code depends on: a User-Agent on every request,
// and Accept: application/octet-stream specifically on the asset download
// (the header that makes GitHub return bytes instead of JSON metadata).
func newFakeGitHub(t *testing.T, fx releaseFixture) (*httptest.Server, *fakeGitHubCounts) {
	t.Helper()
	counts := &fakeGitHubCounts{}

	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("User-Agent"); got == "" {
			t.Errorf("fake GitHub: request for %s missing User-Agent header (GitHub requires one)", r.URL.Path)
		}

		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			atomic.AddInt32(&counts.release, 1)
			status := fx.status
			if status == 0 {
				status = http.StatusOK
			}
			w.WriteHeader(status)
			if status != http.StatusOK {
				return
			}

			var assetsJSON []string
			for name := range fx.assets {
				assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/" + name
				assetsJSON = append(assetsJSON, fmt.Sprintf(`{"name":%q,"url":%q}`, name, assetURL))
			}
			fmt.Fprintf(w, `{"tag_name":%q,"assets":[%s]}`, fx.tag, strings.Join(assetsJSON, ","))

		case strings.HasPrefix(r.URL.Path, "/repos/alcash55/Resume/releases/assets/"):
			atomic.AddInt32(&counts.asset, 1)
			name := strings.TrimPrefix(r.URL.Path, "/repos/alcash55/Resume/releases/assets/")
			if got, want := r.Header.Get("Accept"), "application/octet-stream"; got != want {
				t.Errorf("fake GitHub: asset request for %s Accept header = %q, want %q", name, got, want)
			}

			asset, ok := fx.assets[name]
			if !ok {
				w.WriteHeader(http.StatusNotFound)
				return
			}
			status := asset.status
			if status == 0 {
				status = http.StatusOK
			}
			w.WriteHeader(status)
			if status == http.StatusOK {
				w.Write([]byte(asset.body))
			}

		default:
			t.Fatalf("fake GitHub: unexpected request for path %q", r.URL.Path)
		}
	}))
	return server, counts
}

// newTestRouter wires all resume routes into a real gin router, matching how
// projects_test.go tests its handler. /status is registered alongside
// /:variant to pin that gin resolves the static segment first - the same
// requirement production routing depends on.
func newTestRouter(h *Handler) *gin.Engine {
	r := gin.New()
	r.GET("/api/v1/resume", h.GetResume)
	r.GET("/api/v1/resume/status", h.GetResumeStatus)
	r.GET("/api/v1/resume/:variant", h.GetResumeVariant)
	return r
}

// captureLog redirects the standard logger's output to a buffer for the
// duration of the calling test and restores the previous output when the
// test ends, so log-content assertions don't depend on run order.
func captureLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prevOutput := log.Writer()
	prevFlags := log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	t.Cleanup(func() {
		log.SetOutput(prevOutput)
		log.SetFlags(prevFlags)
	})
	return &buf
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

// pdfFixture returns a fixture whose body carries the PDF magic bytes, so
// tests that only care about the happy path don't need to restate them.
func pdfFixture(body string) assetFixture {
	return assetFixture{body: "%PDF-" + body}
}

// singleAssetRelease returns a releaseFixture with exactly one asset
// attached, for tests that only exercise one variant.
func singleAssetRelease(tag, assetName string, fx assetFixture) releaseFixture {
	return releaseFixture{tag: tag, assets: map[string]assetFixture{assetName: fx}}
}

// allVariantsRelease returns a releaseFixture carrying all three variants'
// assets, each with distinguishable bodies.
func allVariantsRelease(tag string) releaseFixture {
	return releaseFixture{
		tag: tag,
		assets: map[string]assetFixture{
			"fullstack.pdf": pdfFixture("fullstack"),
			"frontend.pdf":  pdfFixture("frontend"),
			"backend.pdf":   pdfFixture("backend"),
		},
	}
}

// --- variant routing ---

// TestGetResume_DefaultsToFullstack proves GET /api/v1/resume (no :variant)
// serves the fullstack asset from the latest release, per the interface
// contract.
func TestGetResume_DefaultsToFullstack(t *testing.T) {
	server, counts := newFakeGitHub(t, singleAssetRelease("v2026.09.16", "fullstack.pdf", pdfFixture("fullstack")))
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
	if got := atomic.LoadInt32(&counts.release); got != 1 {
		t.Errorf("GET /api/v1/resume: releases/latest calls = %d, want 1", got)
	}
	if got := atomic.LoadInt32(&counts.asset); got != 1 {
		t.Errorf("GET /api/v1/resume: asset download calls = %d, want 1", got)
	}
}

// TestGetResumeVariant_EachValidVariant proves each of the three contract
// variants routes to its own asset in the release.
func TestGetResumeVariant_EachValidVariant(t *testing.T) {
	for _, variant := range []string{"fullstack", "frontend", "backend"} {
		t.Run(variant, func(t *testing.T) {
			server, _ := newFakeGitHub(t, allVariantsRelease("v2026.09.16"))
			defer server.Close()

			h := New(testCfg(), WithBaseURL(server.URL))
			router := newTestRouter(h)

			rec := getResume(t, router, "/api/v1/resume/"+variant)
			if rec.Code != http.StatusOK {
				t.Fatalf("GET /api/v1/resume/%s: status = %d, want %d; body: %s", variant, rec.Code, http.StatusOK, rec.Body.String())
			}
			wantBody := "%PDF-" + variant
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
	server, counts := newFakeGitHub(t, allVariantsRelease("v2026.09.16"))
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
	if got := atomic.LoadInt32(&counts.release); got != 0 {
		t.Errorf("releases/latest calls for unknown variants: got %d, want 0 (should be rejected before any fetch)", got)
	}
}

// --- response headers ---

// TestGetResume_Headers proves a success response carries every header the
// interface contract requires, including the release version the brief
// added.
func TestGetResume_Headers(t *testing.T) {
	server, _ := newFakeGitHub(t, singleAssetRelease("v2026.09.16", "backend.pdf", pdfFixture("backend")))
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
	if got, want := rec.Header().Get("X-Resume-Version"), "v2026.09.16"; got != want {
		t.Errorf("X-Resume-Version = %q, want %q (the release actually served)", got, want)
	}
}

// --- caching ---

// TestGetResume_CacheHit_NoAdditionalUpstreamCalls proves a second request
// within the TTL is served entirely from cache, with no repeat of either the
// release lookup or the asset download.
func TestGetResume_CacheHit_NoAdditionalUpstreamCalls(t *testing.T) {
	server, counts := newFakeGitHub(t, singleAssetRelease("v2026.09.16", "fullstack.pdf", pdfFixture("v1")))
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	rec1 := getResume(t, router, "/api/v1/resume")
	if rec1.Code != http.StatusOK {
		t.Fatalf("first request: status = %d, want %d; body: %s", rec1.Code, http.StatusOK, rec1.Body.String())
	}
	if got := atomic.LoadInt32(&counts.release); got != 1 {
		t.Fatalf("releases/latest calls after first request: got %d, want 1", got)
	}

	rec2 := getResume(t, router, "/api/v1/resume")
	if rec2.Code != http.StatusOK {
		t.Fatalf("second request: status = %d, want %d; body: %s", rec2.Code, http.StatusOK, rec2.Body.String())
	}
	if got := atomic.LoadInt32(&counts.release); got != 1 {
		t.Errorf("releases/latest calls after second (within-TTL) request: got %d, want still 1 (cache hit)", got)
	}
	if got := atomic.LoadInt32(&counts.asset); got != 1 {
		t.Errorf("asset download calls after second (within-TTL) request: got %d, want still 1 (cache hit)", got)
	}
	if rec1.Body.String() != rec2.Body.String() {
		t.Errorf("cache hit returned a different body than the original fetch:\nfirst:  %s\nsecond: %s", rec1.Body.String(), rec2.Body.String())
	}
}

// TestGetResume_CacheExpiry_Refetches proves that once the injected clock
// advances past the 10-minute TTL, the next request triggers a fresh
// release lookup and asset download - which is how a new release takes
// effect without an explicit invalidation path.
func TestGetResume_CacheExpiry_Refetches(t *testing.T) {
	server, counts := newFakeGitHub(t, singleAssetRelease("v2026.09.16", "fullstack.pdf", pdfFixture("v1")))
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	getResume(t, router, "/api/v1/resume")
	if got := atomic.LoadInt32(&counts.release); got != 1 {
		t.Fatalf("releases/latest calls after first request: got %d, want 1", got)
	}

	// Still within the 10m TTL: no refetch.
	clock.Advance(9 * time.Minute)
	getResume(t, router, "/api/v1/resume")
	if got := atomic.LoadInt32(&counts.release); got != 1 {
		t.Fatalf("releases/latest calls after advancing 9m (TTL=10m): got %d, want still 1", got)
	}

	// Past the TTL: refetch.
	clock.Advance(2 * time.Minute)
	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("request after TTL expiry: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if got := atomic.LoadInt32(&counts.release); got != 2 {
		t.Errorf("releases/latest calls after advancing past the 10m TTL: got %d, want 2 (a fresh fetch should have happened)", got)
	}
}

// TestGetResume_NewReleaseTag_ReflectedAfterExpiry proves the version header
// changes to the new release's tag once the cache refetches - the cache
// stores the tag alongside the PDF bytes precisely so a new release, once
// fetched, is what gets reported rather than a stale tag surviving the swap.
func TestGetResume_NewReleaseTag_ReflectedAfterExpiry(t *testing.T) {
	var tag atomic.Value
	tag.Store("v2026.09.16")

	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/fullstack.pdf"
			fmt.Fprintf(w, `{"tag_name":%q,"assets":[{"name":"fullstack.pdf","url":%q}]}`, tag.Load().(string), assetURL)
		case r.URL.Path == "/repos/alcash55/Resume/releases/assets/fullstack.pdf":
			w.Write([]byte("%PDF-" + tag.Load().(string)))
		default:
			t.Fatalf("unexpected request for path %q", r.URL.Path)
		}
	}))
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	rec1 := getResume(t, router, "/api/v1/resume")
	if got, want := rec1.Header().Get("X-Resume-Version"), "v2026.09.16"; got != want {
		t.Fatalf("first request: X-Resume-Version = %q, want %q", got, want)
	}

	tag.Store("v2026.09.17")
	clock.Advance(11 * time.Minute) // past the 10m TTL

	rec2 := getResume(t, router, "/api/v1/resume")
	if got, want := rec2.Header().Get("X-Resume-Version"), "v2026.09.17"; got != want {
		t.Errorf("request after a new release + TTL expiry: X-Resume-Version = %q, want %q", got, want)
	}
	if got, want := rec2.Body.String(), "%PDF-v2026.09.17"; got != want {
		t.Errorf("request after a new release + TTL expiry: body = %q, want %q", got, want)
	}
}

// TestGetResume_VariantsCacheIndependently proves fetching one variant does
// not populate, or get served from, another variant's cache.
func TestGetResume_VariantsCacheIndependently(t *testing.T) {
	server, counts := newFakeGitHub(t, allVariantsRelease("v2026.09.16"))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	getResume(t, router, "/api/v1/resume/fullstack")
	getResume(t, router, "/api/v1/resume/frontend")
	if got := atomic.LoadInt32(&counts.release); got != 2 {
		t.Fatalf("releases/latest calls after fetching two distinct variants: got %d, want 2 (each variant fetched once)", got)
	}

	// Both re-requested within TTL: still 2 total, not 4.
	getResume(t, router, "/api/v1/resume/fullstack")
	getResume(t, router, "/api/v1/resume/frontend")
	if got := atomic.LoadInt32(&counts.release); got != 2 {
		t.Errorf("releases/latest calls after re-requesting both within TTL: got %d, want still 2", got)
	}
}

// TestGetResume_StaleOnFailure primes the cache with a good fetch, expires
// it, then makes the upstream fail entirely, and asserts the handler serves
// the previously cached PDF rather than a 502 - old data beats no data, and
// this is also what covers a GitHub outage per the interface contract. It
// stands in for every failure case here: fetchVariant reduces all of them
// (no release, missing asset, a failed download, a non-PDF body) to a single
// opaque error, so the cache's stale-wins behavior does not depend on which
// one occurred.
func TestGetResume_StaleOnFailure(t *testing.T) {
	var fail atomic.Bool
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/fullstack.pdf"
			fmt.Fprintf(w, `{"tag_name":"v2026.09.16","assets":[{"name":"fullstack.pdf","url":%q}]}`, assetURL)
		case r.URL.Path == "/repos/alcash55/Resume/releases/assets/fullstack.pdf":
			w.Write([]byte("%PDF-good"))
		default:
			t.Fatalf("unexpected request for path %q", r.URL.Path)
		}
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

// --- defined failure cases ---
//
// The brief calls out four upstream failures that must each resolve to a
// defined status (502, the existing JSON error shape) rather than an
// incidental one: no release published yet, a release missing the
// requested variant's asset, an asset download that itself fails, and an
// asset body that isn't really a PDF. All four are exercised cold (nothing
// cached yet) since TestGetResume_StaleOnFailure already covers the
// warm-cache side once, for all of them, at the cache layer.

const wantNotLoadedBody = `{"error":"could not load resume"}`

// TestGetResume_NoReleaseExists_502 covers a repo with no releases at all:
// GET releases/latest itself 404s. It also pins that the failure logs a
// distinct, greppable line naming the release-resolution stage and the
// upstream status, which is what turns "the endpoint is down" into "GitHub
// answered 404 to releases/latest" without a debugger.
func TestGetResume_NoReleaseExists_502(t *testing.T) {
	server, counts := newFakeGitHub(t, releaseFixture{status: http.StatusNotFound})
	defer server.Close()

	logs := captureLog(t)
	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("no release exists: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	if got := rec.Body.String(); got != wantNotLoadedBody {
		t.Errorf("no release exists: body = %q, want %q", got, wantNotLoadedBody)
	}
	if got := atomic.LoadInt32(&counts.asset); got != 0 {
		t.Errorf("no release exists: asset download calls = %d, want 0 (nothing to download)", got)
	}
	if got := logs.String(); !strings.Contains(got, "stage=resolve_release") || !strings.Contains(got, "status=404") {
		t.Errorf("no release exists: log output = %q, want it to contain %q and %q", got, "stage=resolve_release", "status=404")
	}
}

// TestGetResume_NoAssetForVariant_502 covers a release that exists but
// shipped without the requested variant's PDF attached, and pins that the
// failure logs the asset-selection stage - distinct from the release-lookup
// stage above, since the two need different fixes (cut a release, versus fix
// what build-resume.yml attaches to it).
func TestGetResume_NoAssetForVariant_502(t *testing.T) {
	fx := releaseFixture{
		tag: "v2026.09.16",
		assets: map[string]assetFixture{
			"frontend.pdf": pdfFixture("frontend"),
			"backend.pdf":  pdfFixture("backend"),
			// no fullstack.pdf
		},
	}
	server, counts := newFakeGitHub(t, fx)
	defer server.Close()

	logs := captureLog(t)
	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("release missing the fullstack asset: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	if got := rec.Body.String(); got != wantNotLoadedBody {
		t.Errorf("release missing the fullstack asset: body = %q, want %q", got, wantNotLoadedBody)
	}
	if got := atomic.LoadInt32(&counts.asset); got != 0 {
		t.Errorf("release missing the fullstack asset: asset download calls = %d, want 0 (nothing to download)", got)
	}
	if got := logs.String(); !strings.Contains(got, "stage=select_asset") {
		t.Errorf("release missing the fullstack asset: log output = %q, want it to contain %q", got, "stage=select_asset")
	}
}

// TestGetResume_AssetDownloadFails_502 covers a release that lists the
// asset, but whose download URL itself fails, and pins that the failure logs
// the download stage plus the upstream status.
func TestGetResume_AssetDownloadFails_502(t *testing.T) {
	fx := singleAssetRelease("v2026.09.16", "fullstack.pdf", assetFixture{status: http.StatusNotFound})
	server, _ := newFakeGitHub(t, fx)
	defer server.Close()

	logs := captureLog(t)
	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("asset download fails: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	if got := rec.Body.String(); got != wantNotLoadedBody {
		t.Errorf("asset download fails: body = %q, want %q", got, wantNotLoadedBody)
	}
	if got := logs.String(); !strings.Contains(got, "stage=download_asset") || !strings.Contains(got, "status=404") {
		t.Errorf("asset download fails: log output = %q, want it to contain %q and %q", got, "stage=download_asset", "status=404")
	}
}

// TestGetResume_AssetBodyNotPDF_502 covers the failure mode the brief calls
// out by name: the asset endpoint answers 200 with a body that isn't a PDF
// (the shape GitHub returns when Accept isn't application/octet-stream).
// The handler must reject it rather than serve JSON to a visitor as if it
// were their resume.
func TestGetResume_AssetBodyNotPDF_502(t *testing.T) {
	fx := singleAssetRelease("v2026.09.16", "fullstack.pdf", assetFixture{body: `{"id":123,"name":"fullstack.pdf"}`})
	server, _ := newFakeGitHub(t, fx)
	defer server.Close()

	logs := captureLog(t)
	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusBadGateway {
		t.Fatalf("non-PDF asset body: status = %d, want %d; body: %s", rec.Code, http.StatusBadGateway, rec.Body.String())
	}
	if got := rec.Body.String(); got != wantNotLoadedBody {
		t.Errorf("non-PDF asset body: body = %q, want %q", got, wantNotLoadedBody)
	}
	// This is the magic-byte check's own failure path, distinct from
	// stage=download_asset above: a 200 status with the wrong body is a
	// different bug (wrong Accept header) than a non-200 status.
	if got := logs.String(); !strings.Contains(got, "stage=verify_pdf") {
		t.Errorf("non-PDF asset body: log output = %q, want it to contain %q", got, "stage=verify_pdf")
	}
}

// TestGetResume_NoTokenConfigured_503WithoutCallingUpstream pins the state
// the endpoint is in until Alex runs scripts/resume-token-wizard.sh: no
// RESUME_GH_TOKEN, no cached data yet. It answers 503, not 502 - a missing
// token is a misconfiguration the deploy can fix, not an upstream failure -
// and the handler never bothers dialing a private repo it has no credential
// for. The JSON body stays the existing error string either way, so the
// frontend does not need to change for this to ship.
func TestGetResume_NoTokenConfigured_503WithoutCallingUpstream(t *testing.T) {
	server, counts := newFakeGitHub(t, allVariantsRelease("v2026.09.16"))
	defer server.Close()

	cfg := config.Config{ResumeGHToken: ""}
	h := New(cfg, WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("no token configured: status = %d, want %d; body: %s", rec.Code, http.StatusServiceUnavailable, rec.Body.String())
	}
	if got := rec.Body.String(); got != wantNotLoadedBody {
		t.Errorf("no token configured: body = %q, want %q (human-facing text unchanged)", got, wantNotLoadedBody)
	}
	if got := atomic.LoadInt32(&counts.release); got != 0 {
		t.Errorf("no token configured: releases/latest calls = %d, want 0 (a private repo with no credential can only fail)", got)
	}
	if got := atomic.LoadInt32(&counts.asset); got != 0 {
		t.Errorf("no token configured: asset download calls = %d, want 0", got)
	}
}

// TestGetResume_TokenNeverLeaksOnFailure proves the token never reaches a
// response body, on the ordinary cold-cache failure path.
func TestGetResume_TokenNeverLeaksOnFailure(t *testing.T) {
	server, _ := newFakeGitHub(t, releaseFixture{status: http.StatusInternalServerError})
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if strings.Contains(rec.Body.String(), testToken) {
		t.Errorf("cold cache + failing upstream: response body leaked the token. Got: %s", rec.Body.String())
	}
}

// TestGetResume_TokenNeverLeaksInLogs is the hard rule from the brief made
// executable: with a token configured, every failure path's log output -
// resolving the release, selecting the asset, downloading it, the PDF check,
// and the response headers a real upstream call would have carried - must
// contain no part of the token. It runs each failure fixture against a
// token deliberately shaped to be easy to spot if it ever leaked.
func TestGetResume_TokenNeverLeaksInLogs(t *testing.T) {
	const sentinelToken = "sentinel-token-must-never-appear-anywhere"

	cases := []struct {
		name string
		fx   releaseFixture
	}{
		{"release lookup fails", releaseFixture{status: http.StatusInternalServerError}},
		{"no release published", releaseFixture{status: http.StatusNotFound}},
		{"release missing the asset", releaseFixture{tag: "v1", assets: map[string]assetFixture{}}},
		{"asset download fails", singleAssetRelease("v1", "fullstack.pdf", assetFixture{status: http.StatusInternalServerError})},
		{"asset body not a PDF", singleAssetRelease("v1", "fullstack.pdf", assetFixture{body: `{"not":"a pdf"}`})},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			server, _ := newFakeGitHub(t, tc.fx)
			defer server.Close()

			logs := captureLog(t)
			cfg := config.Config{ResumeGHToken: sentinelToken}
			h := New(cfg, WithBaseURL(server.URL))
			router := newTestRouter(h)

			rec := getResume(t, router, "/api/v1/resume")

			if strings.Contains(rec.Body.String(), sentinelToken) {
				t.Errorf("%s: response body leaked the token: %s", tc.name, rec.Body.String())
			}
			for name, values := range rec.Header() {
				for _, v := range values {
					if strings.Contains(v, sentinelToken) {
						t.Errorf("%s: response header %s leaked the token: %s", tc.name, name, v)
					}
				}
			}
			if strings.Contains(logs.String(), sentinelToken) {
				t.Errorf("%s: log output leaked the token: %s", tc.name, logs.String())
			}

			statusRec := getResume(t, router, "/api/v1/resume/status")
			if strings.Contains(statusRec.Body.String(), sentinelToken) {
				t.Errorf("%s: /status response leaked the token: %s", tc.name, statusRec.Body.String())
			}
		})
	}
}

// --- Authorization header ---

// TestGetResume_AuthorizationHeader proves the Bearer token is sent on both
// the release lookup and the asset download, since (unlike
// internal/handlers/projects) there is no unauthenticated path for a private
// repo.
func TestGetResume_AuthorizationHeader(t *testing.T) {
	var releaseAuth, assetAuth string
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			releaseAuth = r.Header.Get("Authorization")
			assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/fullstack.pdf"
			fmt.Fprintf(w, `{"tag_name":"v2026.09.16","assets":[{"name":"fullstack.pdf","url":%q}]}`, assetURL)
		case r.URL.Path == "/repos/alcash55/Resume/releases/assets/fullstack.pdf":
			assetAuth = r.Header.Get("Authorization")
			w.Write([]byte("%PDF-v1"))
		default:
			t.Fatalf("unexpected request for path %q", r.URL.Path)
		}
	}))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if want := "Bearer " + testToken; releaseAuth != want {
		t.Errorf("releases/latest Authorization header = %q, want %q", releaseAuth, want)
	}
	if want := "Bearer " + testToken; assetAuth != want {
		t.Errorf("asset download Authorization header = %q, want %q", assetAuth, want)
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
// cold cache and proves they collapse onto exactly one release lookup and
// one asset download, not one pair per concurrent HTTP request.
func TestGetResume_SingleFlight_ColdCache(t *testing.T) {
	const concurrency = 20
	gate := make(chan struct{})
	var releaseCalls int32

	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			atomic.AddInt32(&releaseCalls, 1)
			<-gate
			assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/fullstack.pdf"
			fmt.Fprintf(w, `{"tag_name":"v2026.09.16","assets":[{"name":"fullstack.pdf","url":%q}]}`, assetURL)
		case r.URL.Path == "/repos/alcash55/Resume/releases/assets/fullstack.pdf":
			w.Write([]byte("%PDF-v1"))
		default:
			t.Fatalf("unexpected request for path %q", r.URL.Path)
		}
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
		if atomic.LoadInt32(&releaseCalls) >= 1 {
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
	if got := atomic.LoadInt32(&releaseCalls); got != 1 {
		t.Errorf("releases/latest calls after %d concurrent cold-cache requests: got %d, want 1 (single-flighted across all %d callers)", concurrency, got, concurrency)
	}
}

// --- GET /api/v1/resume/status ---

// statusResponse mirrors the diagnostic's JSON shape for test decoding.
type statusResponse struct {
	TokenConfigured bool `json:"tokenConfigured"`
	Variants        map[string]struct {
		Cached            bool    `json:"cached"`
		ReleaseTag        string  `json:"releaseTag"`
		LastSuccessAt     *string `json:"lastSuccessAt"`
		LastFailureReason string  `json:"lastFailureReason"`
		LastFailureAt     *string `json:"lastFailureAt"`
	} `json:"variants"`
}

func getStatus(t *testing.T, router *gin.Engine) (*httptest.ResponseRecorder, statusResponse) {
	t.Helper()
	rec := getResume(t, router, "/api/v1/resume/status")
	var body statusResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding /status response: %v; body: %s", err, rec.Body.String())
	}
	return rec, body
}

// TestGetResumeStatus_NoTokenConfigured proves the diagnostic reports the
// missing-token case as a bare boolean, needing no dashboard visit to see
// it - the exact gap the incident behind this endpoint exposed.
func TestGetResumeStatus_NoTokenConfigured(t *testing.T) {
	cfg := config.Config{ResumeGHToken: ""}
	h := New(cfg)
	router := newTestRouter(h)

	rec, body := getStatus(t, router)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if body.TokenConfigured {
		t.Errorf("token_configured = true, want false (none set)")
	}
	for _, variant := range []string{"fullstack", "frontend", "backend"} {
		v, ok := body.Variants[variant]
		if !ok {
			t.Fatalf("variants[%q] missing from response: %s", variant, rec.Body.String())
		}
		if v.Cached {
			t.Errorf("variants[%q].cached = true, want false (nothing fetched yet)", variant)
		}
	}
}

// TestGetResumeStatus_TokenConfigured proves the boolean flips once a token
// is set, independent of whether any fetch has happened yet - it reports
// configuration, not fetch history.
func TestGetResumeStatus_TokenConfigured(t *testing.T) {
	h := New(testCfg())
	router := newTestRouter(h)

	_, body := getStatus(t, router)
	if !body.TokenConfigured {
		t.Errorf("token_configured = false, want true (testCfg sets one)")
	}
}

// TestGetResumeStatus_AfterSuccess proves a successful fetch shows up as
// cached=true with the release tag it came from and a populated
// last_success_at, which is what answers "is the cache actually warm" from
// outside.
func TestGetResumeStatus_AfterSuccess(t *testing.T) {
	server, _ := newFakeGitHub(t, singleAssetRelease("v2026.09.16", "fullstack.pdf", pdfFixture("fullstack")))
	defer server.Close()

	h := New(testCfg(), WithBaseURL(server.URL))
	router := newTestRouter(h)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("priming request: status = %d, want %d; body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	_, body := getStatus(t, router)
	fullstack := body.Variants["fullstack"]
	if !fullstack.Cached {
		t.Errorf("fullstack.cached = false, want true after a successful fetch")
	}
	if got, want := fullstack.ReleaseTag, "v2026.09.16"; got != want {
		t.Errorf("fullstack.release_tag = %q, want %q", got, want)
	}
	if fullstack.LastSuccessAt == nil || *fullstack.LastSuccessAt == "" {
		t.Errorf("fullstack.last_success_at = %v, want a populated timestamp", fullstack.LastSuccessAt)
	}

	other := body.Variants["frontend"]
	if other.Cached {
		t.Errorf("frontend.cached = true, want false (only fullstack was fetched)")
	}
}

// TestGetResumeStatus_ReflectsFailureEvenWhenCacheServesStale proves the
// diagnostic surfaces a failure that a stale cache hit masked from the
// visitor-facing response - the exact case that made the 2026-09-16 incident
// hard to see from outside: a healthy-looking 200 to visitors with GitHub
// actually failing underneath.
func TestGetResumeStatus_ReflectsFailureEvenWhenCacheServesStale(t *testing.T) {
	var fail atomic.Bool
	var server *httptest.Server
	server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if fail.Load() {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		switch {
		case r.URL.Path == "/repos/alcash55/Resume/releases/latest":
			assetURL := server.URL + "/repos/alcash55/Resume/releases/assets/fullstack.pdf"
			fmt.Fprintf(w, `{"tag_name":"v2026.09.16","assets":[{"name":"fullstack.pdf","url":%q}]}`, assetURL)
		case r.URL.Path == "/repos/alcash55/Resume/releases/assets/fullstack.pdf":
			w.Write([]byte("%PDF-good"))
		default:
			t.Fatalf("unexpected request for path %q", r.URL.Path)
		}
	}))
	defer server.Close()

	clock := newFakeClock(time.Now())
	h := New(testCfg(), WithBaseURL(server.URL), WithNow(clock.Now))
	router := newTestRouter(h)

	primeRec := getResume(t, router, "/api/v1/resume")
	if primeRec.Code != http.StatusOK {
		t.Fatalf("priming request: status = %d, want %d; body: %s", primeRec.Code, http.StatusOK, primeRec.Body.String())
	}

	clock.Advance(11 * time.Minute) // past the 10m TTL
	fail.Store(true)

	rec := getResume(t, router, "/api/v1/resume")
	if rec.Code != http.StatusOK {
		t.Fatalf("stale-serving request: status = %d, want %d (stale data, not an error); body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	_, body := getStatus(t, router)
	fullstack := body.Variants["fullstack"]
	if fullstack.LastFailureReason == "" {
		t.Errorf("fullstack.last_failure_reason is empty, want the masked refresh failure recorded even though the request itself got a stale 200")
	}
	if fullstack.LastFailureAt == nil || *fullstack.LastFailureAt == "" {
		t.Errorf("fullstack.last_failure_at = %v, want a populated timestamp", fullstack.LastFailureAt)
	}
	// The stale cache entry itself must be untouched by the failed refresh.
	if !fullstack.Cached || fullstack.ReleaseTag != "v2026.09.16" {
		t.Errorf("fullstack cache state = %+v, want the prior successful fetch left in place", fullstack)
	}
}

// TestGetResumeStatus_UnconfiguredTokenRecordsAFailureReason proves the
// no-token case shows up in last_failure_reason too, distinguishable from an
// upstream failure by its text, so the diagnostic alone (without checking
// the response status of a real GET) answers "is this misconfigured".
func TestGetResumeStatus_UnconfiguredTokenRecordsAFailureReason(t *testing.T) {
	cfg := config.Config{ResumeGHToken: ""}
	h := New(cfg)
	router := newTestRouter(h)

	getResume(t, router, "/api/v1/resume")

	_, body := getStatus(t, router)
	reason := body.Variants["fullstack"].LastFailureReason
	if !strings.Contains(reason, "not_configured") {
		t.Errorf("fullstack.last_failure_reason = %q, want it to name the not_configured case", reason)
	}
}
