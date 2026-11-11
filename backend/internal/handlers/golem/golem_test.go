package golem

import (
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

const (
	tagA = "webgl-v1.0.5-aaaaaaaaaaaa-100.1"
	tagB = "webgl-v1.0.6-bbbbbbbbbbbb-200.1"
	tagC = "webgl-v1.0.7-cccccccccccc-300.1"
)

// --- fixtures ---

type fakeClock struct {
	mu  sync.Mutex
	now time.Time
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

// spec describes one fake release. The zero value is a valid, correct release;
// each flag breaks exactly one thing.
type spec struct {
	tag     string
	version string

	omitFile        string // a Build/ file left out of the zip
	plainData       bool   // the data file is not gzip
	tamperAfterHash bool   // a zip byte changes after SHA256SUMS was computed
	swapZip         bool   // a valid zip of the same size but different bytes replaces the one that was hashed
	manifestTag     string // overrides manifest releaseTag
	sumsHash        string // overrides the zip hash in SHA256SUMS
	noSums          bool   // release without a SHA256SUMS asset
	draft           bool
	prerelease      bool
}

type fakeRelease struct {
	spec
	zip       []byte
	manifest  []byte
	sums      []byte
	dataBytes []byte
}

func gzipBytes(t *testing.T, s string) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	if _, err := zw.Write([]byte(s)); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func makeRelease(t *testing.T, s spec) *fakeRelease {
	t.Helper()
	if s.version == "" {
		s.version = "1.0.0"
	}
	r := &fakeRelease{spec: s}

	r.dataBytes = gzipBytes(t, "data-"+s.tag+strings.Repeat("x", 4096))
	content := map[string][]byte{
		"Build/WebGL.data.unityweb":         r.dataBytes,
		"Build/WebGL.framework.js.unityweb": gzipBytes(t, "framework-"+s.tag),
		"Build/WebGL.wasm.unityweb":         gzipBytes(t, "wasm-"+s.tag),
		"Build/WebGL.loader.js":             []byte("loader-" + s.tag),
		"index.html":                        []byte("<html>"),
		"version.json":                      []byte(`{"version":"` + s.version + `"}`),
	}
	if s.plainData {
		content["Build/WebGL.data.unityweb"] = []byte("not gzip at all")
		r.dataBytes = content["Build/WebGL.data.unityweb"]
	}
	if s.omitFile != "" {
		delete(content, "Build/"+s.omitFile)
	}

	var zbuf bytes.Buffer
	zw := zip.NewWriter(&zbuf)
	for _, name := range []string{
		"index.html", "version.json",
		"Build/WebGL.data.unityweb", "Build/WebGL.framework.js.unityweb",
		"Build/WebGL.wasm.unityweb", "Build/WebGL.loader.js",
	} {
		body, ok := content[name]
		if !ok {
			continue
		}
		w, err := zw.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := w.Write(body); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	r.zip = zbuf.Bytes()

	sum := sha256.Sum256(r.zip)
	hash := hex.EncodeToString(sum[:])

	manifestTag := s.manifestTag
	if manifestTag == "" {
		manifestTag = s.tag
	}
	m := map[string]any{
		"schemaVersion": 1,
		"version":       s.version,
		"gitSha":        "8ae0558d85597472f42eba9b34a02986e83c363b",
		"unityVersion":  "6000.5.9f1",
		"releaseTag":    manifestTag,
		"runUrl":        "https://github.com/alcash55/Golem-Miners/actions/runs/1",
		"builtAt":       "2026-11-10T21:49:05.315285+00:00",
		"archive": map[string]any{
			"file":   "golem-miners-webgl.zip",
			"sha256": hash,
			"size":   len(r.zip),
		},
	}
	var err error
	if r.manifest, err = json.Marshal(m); err != nil {
		t.Fatal(err)
	}

	sumsHash := hash
	if s.sumsHash != "" {
		sumsHash = s.sumsHash
	}
	r.sums = []byte(sumsHash + "  golem-miners-webgl.zip\n")

	if s.tamperAfterHash {
		r.zip = append([]byte(nil), r.zip...)
		r.zip[len(r.zip)/2] ^= 0xff
	}
	if s.swapZip {
		// Renaming an unused entry keeps the zip valid, the same size and every CRC
		// correct, so only the SHA-256 can tell it from the release that was published.
		r.zip = bytes.ReplaceAll(r.zip, []byte("index.html"), []byte("index.htmx"))
	}
	return r
}

// fakeGitHub answers the few GitHub endpoints the handler calls and records
// what it was asked, including every Authorization header.
type fakeGitHub struct {
	t   *testing.T
	srv *httptest.Server

	mu          sync.Mutex
	latestTag   string
	latestCode  int // 0 means 200
	releases    map[string]*fakeRelease
	order       []string // newest first, for the list endpoint
	listCode    int
	zipCode     int    // forced status for zip downloads
	zipRedirect string // when set, zip downloads redirect to this URL
	calls       map[string]int
	auth        map[string][]string
}

func newFakeGitHub(t *testing.T, releases ...*fakeRelease) *fakeGitHub {
	t.Helper()
	g := &fakeGitHub{
		t:        t,
		releases: map[string]*fakeRelease{},
		calls:    map[string]int{},
		auth:     map[string][]string{},
	}
	for _, r := range releases {
		g.add(r)
	}
	if len(releases) > 0 {
		g.latestTag = releases[0].tag
	}
	g.srv = httptest.NewServer(g)
	t.Cleanup(g.srv.Close)
	return g
}

// add puts r at the front of the list: it is the newest release.
func (g *fakeGitHub) add(r *fakeRelease) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.releases[r.tag] = r
	g.order = append([]string{r.tag}, g.order...)
}

func (g *fakeGitHub) setLatest(tag string) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.latestTag = tag
}

func (g *fakeGitHub) setLatestCode(code int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.latestCode = code
}

func (g *fakeGitHub) count(path string) int {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.calls[path]
}

func (g *fakeGitHub) zipDownloads() int {
	g.mu.Lock()
	defer g.mu.Unlock()
	n := 0
	for p, c := range g.calls {
		if strings.HasSuffix(p, "/golem-miners-webgl.zip") {
			n += c
		}
	}
	return n
}

func (g *fakeGitHub) releaseJSON(r *fakeRelease) map[string]any {
	asset := func(name string, size int) map[string]any {
		return map[string]any{
			"name": name,
			"url":  g.srv.URL + "/assets/" + r.tag + "/" + name,
			"size": size,
		}
	}
	assets := []map[string]any{
		asset("golem-miners-webgl.zip", len(r.zip)),
		asset("webgl-manifest.json", len(r.manifest)),
	}
	if !r.noSums {
		assets = append(assets, asset("SHA256SUMS", len(r.sums)))
	}
	return map[string]any{
		"tag_name":   r.tag,
		"draft":      r.draft,
		"prerelease": r.prerelease,
		"assets":     assets,
	}
}

func (g *fakeGitHub) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	g.mu.Lock()
	defer g.mu.Unlock()
	path := req.URL.Path
	g.calls[path]++
	g.auth[path] = append(g.auth[path], req.Header.Get("Authorization"))

	const api = "/repos/alcash55/Golem-Miners/releases"
	writeJSON := func(v any) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(v)
	}

	switch {
	case path == api+"/latest":
		if g.latestCode != 0 {
			http.Error(w, "boom", g.latestCode)
			return
		}
		r, ok := g.releases[g.latestTag]
		if !ok {
			http.NotFound(w, req)
			return
		}
		writeJSON(g.releaseJSON(r))
	case strings.HasPrefix(path, api+"/tags/"):
		r, ok := g.releases[strings.TrimPrefix(path, api+"/tags/")]
		if !ok {
			http.NotFound(w, req)
			return
		}
		writeJSON(g.releaseJSON(r))
	case path == api:
		if g.listCode != 0 {
			http.Error(w, "boom", g.listCode)
			return
		}
		list := []map[string]any{}
		for _, tag := range g.order {
			list = append(list, g.releaseJSON(g.releases[tag]))
		}
		writeJSON(list)
	case strings.HasPrefix(path, "/assets/"):
		parts := strings.SplitN(strings.TrimPrefix(path, "/assets/"), "/", 2)
		r, ok := g.releases[parts[0]]
		if !ok || len(parts) != 2 {
			http.NotFound(w, req)
			return
		}
		if req.Header.Get("Accept") != "application/octet-stream" {
			// What GitHub does: JSON metadata with a 200.
			writeJSON(map[string]string{"name": parts[1]})
			return
		}
		switch parts[1] {
		case "golem-miners-webgl.zip":
			if g.zipCode != 0 {
				http.Error(w, "boom", g.zipCode)
				return
			}
			if g.zipRedirect != "" {
				http.Redirect(w, req, g.zipRedirect, http.StatusFound)
				return
			}
			_, _ = w.Write(r.zip)
		case "webgl-manifest.json":
			_, _ = w.Write(r.manifest)
		case "SHA256SUMS":
			_, _ = w.Write(r.sums)
		default:
			http.NotFound(w, req)
		}
	default:
		http.NotFound(w, req)
	}
}

type env struct {
	gh    *fakeGitHub
	h     *Handler
	r     *gin.Engine
	clock *fakeClock
	dir   string
}

func newEnv(t *testing.T, gh *fakeGitHub, mod func(*config.Config)) *env {
	t.Helper()
	cfg := config.Config{GolemGHToken: "test-token-do-not-leak"}
	if mod != nil {
		mod(&cfg)
	}
	clock := &fakeClock{now: time.Date(2026, 11, 10, 22, 0, 0, 0, time.UTC)}
	dir := t.TempDir()
	h := New(cfg, WithBaseURL(gh.srv.URL), WithNow(clock.Now), WithDir(dir))
	r := gin.New()
	// Both the short paths the tests use and the real ones the metadata links to.
	for _, prefix := range []string{"", "/api/v1/golem-miners"} {
		r.GET(prefix+"/latest", h.GetLatest)
		r.GET(prefix+"/builds/:tag/:file", h.GetFile)
	}
	return &env{gh: gh, h: h, r: r, clock: clock, dir: dir}
}

func (e *env) get(path string, headers ...string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	rec := httptest.NewRecorder()
	e.r.ServeHTTP(rec, req)
	return rec
}

func (e *env) latest(t *testing.T, query string) (response, *httptest.ResponseRecorder) {
	t.Helper()
	rec := e.get("/latest" + query)
	var resp response
	if rec.Code == http.StatusOK {
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("decoding %q: %v", rec.Body.String(), err)
		}
	}
	return resp, rec
}

func wantStatus(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != want {
		t.Fatalf("status = %d, want %d; body: %s", rec.Code, want, rec.Body.String())
	}
}

// --- GET /latest ---

func TestLatest_ServesTheNewestVerifiedBuild(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA, version: "1.0.5"})
	b := makeRelease(t, spec{tag: tagB, version: "1.0.6"})
	gh := newFakeGitHub(t, b, a)
	e := newEnv(t, gh, nil)

	resp, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)

	if resp.Tag != tagB || resp.Version != "1.0.6" || resp.Stale {
		t.Errorf("got tag=%q version=%q stale=%v, want %q 1.0.6 false", resp.Tag, resp.Version, resp.Stale, tagB)
	}
	if resp.GitSHA != "8ae0558d85597472f42eba9b34a02986e83c363b" || resp.UnityVersion != "6000.5.9f1" {
		t.Errorf("gitSha/unityVersion = %q / %q", resp.GitSHA, resp.UnityVersion)
	}
	if want := time.Date(2026, 11, 10, 21, 49, 5, 315285000, time.UTC); !resp.BuiltAt.Equal(want) {
		t.Errorf("builtAt = %v, want %v", resp.BuiltAt, want)
	}
	if got := rec.Header().Get("Cache-Control"); got != "public, max-age=60" {
		t.Errorf("Cache-Control = %q, want public, max-age=60", got)
	}

	if len(resp.Files) != 4 {
		t.Fatalf("got %d files, want 4: %+v", len(resp.Files), resp.Files)
	}
	data := resp.Files[0]
	sum := sha256.Sum256(b.dataBytes)
	if data.Name != "WebGL.data.unityweb" ||
		data.URL != "/api/v1/golem-miners/builds/"+tagB+"/WebGL.data.unityweb" ||
		data.SHA256 != hex.EncodeToString(sum[:]) ||
		data.Size != int64(len(b.dataBytes)) ||
		data.ContentType != "application/octet-stream" ||
		data.ContentEncoding != "gzip" {
		t.Errorf("data file entry = %+v", data)
	}
	if loader := resp.Files[3]; loader.Name != "WebGL.loader.js" || loader.ContentEncoding != "" {
		t.Errorf("loader entry = %+v, want no content encoding", loader)
	}
}

// Resolve latest once, then fetch by that exact tag: nothing the loader asks
// GitHub for may come from another release.
func TestLatest_FetchesEveryAssetOfTheResolvedRelease(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA})
	b := makeRelease(t, spec{tag: tagB})
	gh := newFakeGitHub(t, b, a)
	e := newEnv(t, gh, nil)

	_, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)

	if n := gh.count("/repos/alcash55/Golem-Miners/releases/latest"); n != 1 {
		t.Errorf("latest resolved %d times, want 1", n)
	}
	for _, name := range []string{"golem-miners-webgl.zip", "webgl-manifest.json", "SHA256SUMS"} {
		if n := gh.count("/assets/" + tagB + "/" + name); n != 1 {
			t.Errorf("%s of %s fetched %d times, want 1", name, tagB, n)
		}
		if n := gh.count("/assets/" + tagA + "/" + name); n != 0 {
			t.Errorf("%s of the older release was fetched %d times, want 0", name, n)
		}
	}
}

func TestLatest_CachesResolutionAndPicksUpANewReleaseWithinAMinute(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA, version: "1.0.5"})
	gh := newFakeGitHub(t, a)
	e := newEnv(t, gh, nil)

	if resp, _ := e.latest(t, ""); resp.Tag != tagA {
		t.Fatalf("first tag = %q, want %q", resp.Tag, tagA)
	}
	gh.add(makeRelease(t, spec{tag: tagB, version: "1.0.6"}))
	gh.setLatest(tagB)

	e.clock.Advance(30 * time.Second)
	if resp, _ := e.latest(t, ""); resp.Tag != tagA {
		t.Errorf("after 30s tag = %q, want the cached %q", resp.Tag, tagA)
	}
	if n := gh.count("/repos/alcash55/Golem-Miners/releases/latest"); n != 1 {
		t.Errorf("latest called %d times within the TTL, want 1", n)
	}

	e.clock.Advance(31 * time.Second)
	resp, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)
	if resp.Tag != tagB || resp.Stale {
		t.Errorf("after the TTL tag=%q stale=%v, want %q false", resp.Tag, resp.Stale, tagB)
	}
}

func TestLatest_ConcurrentColdRequestsDownloadOnce(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)

	var wg sync.WaitGroup
	codes := make([]int, 8)
	for i := range codes {
		wg.Add(1)
		go func() {
			defer wg.Done()
			codes[i] = e.get("/latest").Code
		}()
	}
	wg.Wait()

	for i, c := range codes {
		if c != http.StatusOK {
			t.Errorf("request %d status = %d, want 200", i, c)
		}
	}
	if n := gh.zipDownloads(); n != 1 {
		t.Errorf("zip downloaded %d times for 8 concurrent requests, want 1", n)
	}
}

func TestLatest_WithoutTokenAnswers503AndCallsNothing(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, func(c *config.Config) { c.GolemGHToken = "" })

	for _, path := range []string{"/latest", "/builds/" + tagB + "/WebGL.loader.js"} {
		wantStatus(t, e.get(path), http.StatusServiceUnavailable)
	}
	if len(gh.calls) != 0 {
		t.Errorf("GitHub was called without a token: %v", gh.calls)
	}
}

// --- fail closed ---

func TestLatest_ChecksumMismatchServesNothing(t *testing.T) {
	bad := makeRelease(t, spec{tag: tagB, tamperAfterHash: true})
	gh := newFakeGitHub(t, bad)
	e := newEnv(t, gh, nil)

	rec := e.get("/latest")
	wantStatus(t, rec, http.StatusBadGateway)
	if strings.Contains(rec.Body.String(), "checksum") {
		t.Errorf("response leaks the failure stage: %s", rec.Body.String())
	}
	wantStatus(t, e.get("/builds/"+tagB+"/WebGL.data.unityweb"), http.StatusBadGateway)

	entries, err := os.ReadDir(e.dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Errorf("a rejected build left %d entries on disk: %v", len(entries), entries)
	}
}

// A byte flip is also caught by the zip's own CRC, so it does not prove the SHA-256 check
// works. This zip passes every structural check and differs from the hashed one only in bytes.
func TestLatest_ValidZipWithTheWrongHashServesNothing(t *testing.T) {
	swapped := makeRelease(t, spec{tag: tagB, swapZip: true})
	if len(swapped.zip) == 0 || bytes.Equal(swapped.zip, makeRelease(t, spec{tag: tagB}).zip) {
		t.Fatal("test setup: the swapped zip must differ from the hashed one")
	}
	gh := newFakeGitHub(t, swapped)
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest"), http.StatusBadGateway)
	wantStatus(t, e.get("/builds/"+tagB+"/WebGL.data.unityweb"), http.StatusBadGateway)

	entries, err := os.ReadDir(e.dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 0 {
		t.Errorf("a rejected build left %d entries on disk: %v", len(entries), entries)
	}
}

func TestLatest_RejectsReleasesThatDisagreeWithThemselves(t *testing.T) {
	other := strings.Repeat("0", 64)
	tests := []struct {
		name string
		s    spec
	}{
		{"SHA256SUMS differs from the zip", spec{tag: tagB, sumsHash: other}},
		{"manifest names another tag", spec{tag: tagB, manifestTag: tagA}},
		{"release has no SHA256SUMS", spec{tag: tagB, noSums: true}},
		{"zip lacks a required file", spec{tag: tagB, omitFile: "WebGL.wasm.unityweb"}},
		{"a .unityweb file is not gzip", spec{tag: tagB, plainData: true}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gh := newFakeGitHub(t, makeRelease(t, tt.s))
			e := newEnv(t, gh, nil)
			wantStatus(t, e.get("/latest"), http.StatusBadGateway)
		})
	}
}

func TestLatest_RejectsALatestReleaseThatIsNotAWebGLTag(t *testing.T) {
	notGame := makeRelease(t, spec{tag: "v2.0.0-editor-tools"})
	gh := newFakeGitHub(t, notGame)
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest"), http.StatusBadGateway)
	if n := gh.zipDownloads(); n != 0 {
		t.Errorf("downloaded %d zips for a non-WebGL release, want 0", n)
	}
}

func TestLatest_GitHubErrorWithNothingCachedIs502(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	gh.setLatestCode(http.StatusInternalServerError)
	e := newEnv(t, gh, nil)

	rec := e.get("/latest")
	wantStatus(t, rec, http.StatusBadGateway)
	if strings.Contains(rec.Body.String(), "test-token") {
		t.Errorf("response contains the token: %s", rec.Body.String())
	}
}

func TestLatest_ZipDownloadFailureIs502(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	gh.zipCode = http.StatusServiceUnavailable
	e := newEnv(t, gh, nil)
	wantStatus(t, e.get("/latest"), http.StatusBadGateway)
}

// A newer release that fails verification must not replace a build that passed.
func TestLatest_FallsBackToTheLastGoodBuildWhenTheNewestFailsVerification(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA, version: "1.0.5"})
	gh := newFakeGitHub(t, a)
	e := newEnv(t, gh, nil)
	if resp, _ := e.latest(t, ""); resp.Tag != tagA || resp.Stale {
		t.Fatalf("setup: tag=%q stale=%v", resp.Tag, resp.Stale)
	}

	gh.add(makeRelease(t, spec{tag: tagB, version: "1.0.6", tamperAfterHash: true}))
	gh.setLatest(tagB)
	e.clock.Advance(2 * time.Minute)

	resp, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)
	if resp.Tag != tagA || !resp.Stale {
		t.Errorf("tag=%q stale=%v, want %q true", resp.Tag, resp.Stale, tagA)
	}
	// The files the response points at must still be served.
	wantStatus(t, e.get(resp.Files[0].URL), http.StatusOK)
}

func TestLatest_ServesTheCachedBuildWhenGitHubGoesDown(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)
	if _, rec := e.latest(t, ""); rec.Code != http.StatusOK {
		t.Fatalf("setup: status %d", rec.Code)
	}

	gh.setLatestCode(http.StatusBadGateway)
	e.clock.Advance(10 * time.Minute)

	resp, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)
	if resp.Tag != tagB || !resp.Stale {
		t.Errorf("tag=%q stale=%v, want %q true", resp.Tag, resp.Stale, tagB)
	}
}

func TestLatest_AFailedReleaseIsNotRedownloadedEveryRequest(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB, tamperAfterHash: true}))
	e := newEnv(t, gh, nil)

	for range 5 {
		wantStatus(t, e.get("/latest"), http.StatusBadGateway)
	}
	if n := gh.zipDownloads(); n != 1 {
		t.Errorf("zip downloaded %d times across 5 requests, want 1", n)
	}

	e.clock.Advance(failureCooldown + time.Second)
	wantStatus(t, e.get("/latest"), http.StatusBadGateway)
	if n := gh.zipDownloads(); n != 2 {
		t.Errorf("zip downloaded %d times after the cooldown, want 2", n)
	}
}

// --- the token ---

func TestToken_NeverReachesTheStorageHostOrTheClient(t *testing.T) {
	storage := &fakeGitHub{t: t, releases: map[string]*fakeRelease{}, calls: map[string]int{}, auth: map[string][]string{}}
	release := makeRelease(t, spec{tag: tagB})
	storageSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		storage.mu.Lock()
		storage.auth["zip"] = append(storage.auth["zip"], r.Header.Get("Authorization"))
		storage.mu.Unlock()
		_, _ = w.Write(release.zip)
	}))
	t.Cleanup(storageSrv.Close)

	gh := newFakeGitHub(t, release)
	// Another host name for the same loopback server, as GitHub's storage
	// host differs from api.github.com.
	u, err := url.Parse(storageSrv.URL)
	if err != nil {
		t.Fatal(err)
	}
	gh.zipRedirect = "http://localhost:" + u.Port() + "/zip"
	e := newEnv(t, gh, nil)

	rec := e.get("/latest")
	wantStatus(t, rec, http.StatusOK)

	if got := storage.auth["zip"]; len(got) != 1 || got[0] != "" {
		t.Errorf("storage host saw Authorization %q, want one request with none", got)
	}
	if got := gh.auth["/assets/"+tagB+"/golem-miners-webgl.zip"]; len(got) != 1 || got[0] != "Bearer test-token-do-not-leak" {
		t.Errorf("API host saw Authorization %q, want the bearer token once", got)
	}
	if strings.Contains(rec.Body.String(), "test-token") {
		t.Errorf("metadata contains the token: %s", rec.Body.String())
	}
}

func TestToken_IsNotSentToAnAssetURLOutsideTheAPIHost(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)
	e.h.baseURL = "https://api.github.com" // asset URLs from the fake point at srv.URL

	_, err := e.h.fetchSmall(t.Context(), gh.srv.URL+"/assets/"+tagB+"/SHA256SUMS")
	if err == nil {
		t.Fatal("fetchSmall accepted an asset URL on another host")
	}
	if len(gh.calls) != 0 {
		t.Errorf("request reached the other host: %v", gh.calls)
	}
}

// --- ?tag= and the pin ---

func TestTag_ServesAnOlderReleaseByName(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA, version: "1.0.5"})
	b := makeRelease(t, spec{tag: tagB, version: "1.0.6"})
	gh := newFakeGitHub(t, b, a)
	e := newEnv(t, gh, nil)

	resp, rec := e.latest(t, "?tag="+tagA)
	wantStatus(t, rec, http.StatusOK)
	if resp.Tag != tagA || resp.Version != "1.0.5" {
		t.Errorf("tag=%q version=%q, want %q 1.0.5", resp.Tag, resp.Version, tagA)
	}
}

func TestTag_RejectsWhatIsNotAGameBuildBeforeCallingGitHub(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)

	for _, q := range []string{"v1.0.6", "webgl-v", "webgl-v1/../x", "webgl-v1%00", "main"} {
		rec := e.get("/latest?tag=" + url.QueryEscape(q))
		wantStatus(t, rec, http.StatusBadRequest)
	}
	if len(gh.calls) != 0 {
		t.Errorf("GitHub was called for malformed tags: %v", gh.calls)
	}
}

func TestTag_UnknownTagIs404AndStartsNoDownload(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest?tag="+tagC), http.StatusNotFound)
	if n := gh.zipDownloads(); n != 0 {
		t.Errorf("downloaded %d zips for an unknown tag, want 0", n)
	}
}

func TestTag_DraftsAndPrereleasesAreNotSelectable(t *testing.T) {
	draft := makeRelease(t, spec{tag: tagC, draft: true})
	pre := makeRelease(t, spec{tag: tagA, prerelease: true})
	b := makeRelease(t, spec{tag: tagB})
	gh := newFakeGitHub(t, b, pre, draft)
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest?tag="+tagC), http.StatusNotFound)
	wantStatus(t, e.get("/latest?tag="+tagA), http.StatusNotFound)
}

// Each unseen tag is a ~65 MiB download, so ?tag= cannot be used to churn them.
func TestTag_LoadingAnotherBuildIsRateLimited(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA})
	b := makeRelease(t, spec{tag: tagB})
	c := makeRelease(t, spec{tag: tagC})
	gh := newFakeGitHub(t, c, b, a)
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest?tag="+tagA), http.StatusOK)
	rec := e.get("/latest?tag=" + tagB)
	wantStatus(t, rec, http.StatusTooManyRequests)
	if rec.Header().Get("Retry-After") == "" {
		t.Error("429 has no Retry-After")
	}
	if n := gh.zipDownloads(); n != 1 {
		t.Errorf("zip downloaded %d times, want 1", n)
	}

	// A resident tag costs nothing again, even inside the limit window.
	wantStatus(t, e.get("/latest?tag="+tagA), http.StatusOK)
	if n := gh.zipDownloads(); n != 1 {
		t.Errorf("zip downloaded %d times after re-reading a resident tag, want 1", n)
	}
	// The default build is never limited.
	wantStatus(t, e.get("/latest"), http.StatusOK)

	e.clock.Advance(otherLoadInterval + time.Second)
	wantStatus(t, e.get("/latest?tag="+tagB), http.StatusOK)
}

func TestTag_AtMostTwoBuildsStayOnDisk(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA})
	b := makeRelease(t, spec{tag: tagB})
	c := makeRelease(t, spec{tag: tagC})
	gh := newFakeGitHub(t, c, b, a)
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/latest"), http.StatusOK) // default tagC
	wantStatus(t, e.get("/latest?tag="+tagA), http.StatusOK)
	e.clock.Advance(2 * time.Minute)
	wantStatus(t, e.get("/latest?tag="+tagB), http.StatusOK) // replaces tagA

	entries, err := os.ReadDir(e.dir)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 {
		t.Fatalf("%d entries on disk, want 2 (the default and one other): %v", len(entries), entries)
	}

	// The default survives, and so does the newest explicit one.
	before := gh.zipDownloads()
	wantStatus(t, e.get("/builds/"+tagC+"/WebGL.loader.js"), http.StatusOK)
	wantStatus(t, e.get("/builds/"+tagB+"/WebGL.loader.js"), http.StatusOK)
	if n := gh.zipDownloads(); n != before {
		t.Errorf("resident builds triggered %d extra downloads", n-before)
	}
}

func TestPin_FollowsThePinnedReleaseNotLatest(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA, version: "1.0.5"})
	b := makeRelease(t, spec{tag: tagB, version: "1.0.6"})
	gh := newFakeGitHub(t, b, a)
	e := newEnv(t, gh, func(c *config.Config) { c.GolemPinTag = tagA })

	resp, rec := e.latest(t, "")
	wantStatus(t, rec, http.StatusOK)
	if resp.Tag != tagA || resp.Stale {
		t.Errorf("tag=%q stale=%v, want %q false", resp.Tag, resp.Stale, tagA)
	}
	if n := gh.count("/repos/alcash55/Golem-Miners/releases/latest"); n != 0 {
		t.Errorf("latest was resolved %d times with a pin set, want 0", n)
	}
}

func TestPin_ABrokenPinDoesNotFallBackToANewerRelease(t *testing.T) {
	b := makeRelease(t, spec{tag: tagB})
	gh := newFakeGitHub(t, b)
	e := newEnv(t, gh, func(c *config.Config) { c.GolemPinTag = tagA }) // no such release

	wantStatus(t, e.get("/latest"), http.StatusBadGateway)
	if n := gh.zipDownloads(); n != 0 {
		t.Errorf("downloaded %d zips with a dangling pin, want 0", n)
	}
}

// --- GET /builds/:tag/:file ---

// The stored gzip must leave as opaque bytes. With a Content-Encoding header the
// Worker's fetch() inflates the body and the browser gets plain bytes labeled
// gzip, which a probe against workerd reproduced. The metadata still says how
// the browser must receive each file.
func TestFile_ServesExactBytesAsOpaqueOctetStream(t *testing.T) {
	b := makeRelease(t, spec{tag: tagB})
	gh := newFakeGitHub(t, b)
	e := newEnv(t, gh, nil)
	resp, _ := e.latest(t, "")

	tests := []struct {
		name, browserType, browserEncoding, wireType string
	}{
		{"WebGL.data.unityweb", "application/octet-stream", "gzip", "application/octet-stream"},
		{"WebGL.framework.js.unityweb", "application/javascript", "gzip", "application/octet-stream"},
		{"WebGL.wasm.unityweb", "application/wasm", "gzip", "application/octet-stream"},
		{"WebGL.loader.js", "application/javascript", "", "application/javascript"},
	}
	for i, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if resp.Files[i].Name != tt.name ||
				resp.Files[i].ContentType != tt.browserType ||
				resp.Files[i].ContentEncoding != tt.browserEncoding {
				t.Errorf("metadata = %+v, want type %q encoding %q", resp.Files[i], tt.browserType, tt.browserEncoding)
			}

			rec := e.get(resp.Files[i].URL)
			wantStatus(t, rec, http.StatusOK)
			h := rec.Header()
			if h.Get("Content-Type") != tt.wireType {
				t.Errorf("Content-Type = %q, want %q", h.Get("Content-Type"), tt.wireType)
			}
			if got := h.Get("Content-Encoding"); got != "" {
				t.Errorf("Content-Encoding = %q, want none", got)
			}
			if tt.browserEncoding == "gzip" && !bytes.HasPrefix(rec.Body.Bytes(), []byte{0x1f, 0x8b}) {
				t.Errorf("body does not start with the gzip magic: % x", rec.Body.Bytes()[:4])
			}
			if h.Get("Cache-Control") != "public, max-age=31536000, immutable" {
				t.Errorf("Cache-Control = %q", h.Get("Cache-Control"))
			}
			if h.Get("ETag") != `"`+resp.Files[i].SHA256+`"` {
				t.Errorf("ETag = %q, want the file's SHA-256", h.Get("ETag"))
			}
			if h.Get("Last-Modified") != "Tue, 10 Nov 2026 21:49:05 GMT" {
				t.Errorf("Last-Modified = %q", h.Get("Last-Modified"))
			}
			sum := sha256.Sum256(rec.Body.Bytes())
			if hex.EncodeToString(sum[:]) != resp.Files[i].SHA256 {
				t.Error("served bytes do not match the SHA-256 in the metadata")
			}
		})
	}

	if got := e.get(resp.Files[0].URL).Body.Bytes(); !bytes.Equal(got, b.dataBytes) {
		t.Errorf("data file differs from the zip's: %d bytes vs %d", len(got), len(b.dataBytes))
	}
}

func TestFile_ETagAndLastModifiedChangeWithTheBuild(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA})
	b := makeRelease(t, spec{tag: tagB})
	gh := newFakeGitHub(t, a)
	e := newEnv(t, gh, nil)

	first := e.get("/builds/" + tagA + "/WebGL.data.unityweb")
	// A real second build has its own builtAt as well.
	gh.add(b)
	gh.setLatest(tagB)
	e.clock.Advance(2 * time.Minute)
	second := e.get("/builds/" + tagB + "/WebGL.data.unityweb")

	wantStatus(t, first, http.StatusOK)
	wantStatus(t, second, http.StatusOK)
	if first.Header().Get("ETag") == second.Header().Get("ETag") {
		t.Errorf("both builds have ETag %s", first.Header().Get("ETag"))
	}
}

func TestFile_AnswersConditionalAndRangeRequests(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)
	path := "/builds/" + tagB + "/WebGL.data.unityweb"
	etag := e.get(path).Header().Get("ETag")

	wantStatus(t, e.get(path, "If-None-Match", etag), http.StatusNotModified)

	rec := e.get(path, "Range", "bytes=0-3")
	wantStatus(t, rec, http.StatusPartialContent)
	if rec.Body.Len() != 4 || rec.Body.Bytes()[0] != 0x1f || rec.Body.Bytes()[1] != 0x8b {
		t.Errorf("range body = %x, want the first four gzip bytes", rec.Body.Bytes())
	}
}

func TestFile_RejectsNamesOutsideTheAllowlist(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)
	e.latest(t, "")

	for _, name := range []string{"index.html", "version.json", "..%2Fsecret", "WebGL.data.unityweb%2F..", "webgl.loader.js"} {
		rec := e.get("/builds/" + tagB + "/" + name)
		if rec.Code != http.StatusNotFound {
			t.Errorf("file %q: status = %d, want 404", name, rec.Code)
		}
	}
	for _, tag := range []string{"main", "webgl-v", "v1.0.6"} {
		rec := e.get("/builds/" + tag + "/WebGL.loader.js")
		if rec.Code != http.StatusNotFound {
			t.Errorf("tag %q: status = %d, want 404", tag, rec.Code)
		}
	}
}

func TestFile_PreviousBuildStaysAvailableAfterANewReleaseGoesLive(t *testing.T) {
	a := makeRelease(t, spec{tag: tagA})
	gh := newFakeGitHub(t, a)
	e := newEnv(t, gh, nil)
	old, _ := e.latest(t, "")

	gh.add(makeRelease(t, spec{tag: tagB}))
	gh.setLatest(tagB)
	e.clock.Advance(2 * time.Minute)
	if resp, _ := e.latest(t, ""); resp.Tag != tagB {
		t.Fatalf("setup: tag = %q", resp.Tag)
	}

	// A visitor who read the old metadata a minute ago still gets matching files.
	wantStatus(t, e.get(old.Files[0].URL), http.StatusOK)
	if n := gh.zipDownloads(); n != 2 {
		t.Errorf("zip downloaded %d times, want 2 (one per release)", n)
	}
}

func TestFile_ServesAResidentBuildWhileGitHubIsDown(t *testing.T) {
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)
	resp, _ := e.latest(t, "")

	gh.srv.Close()
	wantStatus(t, e.get(resp.Files[0].URL), http.StatusOK)
}

func TestFile_ColdRequestLoadsTheBuildItself(t *testing.T) {
	// The Render instance restarted between the metadata call and the file call.
	gh := newFakeGitHub(t, makeRelease(t, spec{tag: tagB}))
	e := newEnv(t, gh, nil)

	wantStatus(t, e.get("/builds/"+tagB+"/WebGL.loader.js"), http.StatusOK)
	wantStatus(t, e.get("/builds/"+tagC+"/WebGL.loader.js"), http.StatusNotFound)
}

func TestNew_DefaultDirIsCreatedLazily(t *testing.T) {
	h := New(config.Config{GolemGHToken: "x"})
	if h.store.root != "" {
		t.Errorf("store root = %q before any load, want none", h.store.root)
	}
	if _, err := filepath.Abs(os.TempDir()); err != nil {
		t.Fatal(err)
	}
}

// --- parsing ---

func TestParseSums(t *testing.T) {
	h := strings.Repeat("ab", 32)
	got := parseSums([]byte(fmt.Sprintf("%s  golem-miners-webgl.zip\n%s *other.bin\nshort  x\n\n", strings.ToUpper(h), h)))
	if got["golem-miners-webgl.zip"] != h {
		t.Errorf("zip entry = %q, want the lowercased hash", got["golem-miners-webgl.zip"])
	}
	if got["other.bin"] != h {
		t.Errorf("binary-mode entry = %q", got["other.bin"])
	}
	if len(got) != 2 {
		t.Errorf("parsed %d entries, want 2: %v", len(got), got)
	}
}
