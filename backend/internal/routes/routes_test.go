package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestIsLocalhost pins the entire local-dev CORS boundary. isLocalhost is
// consulted only when AllowAnyLocalhost is true (see New()), and a false
// positive here means an arbitrary origin gets credentialed cross-origin
// access during local development.
func TestIsLocalhost(t *testing.T) {
	tests := []struct {
		name   string
		origin string
		want   bool
	}{
		// --- must accept ---
		{name: "localhost with dev port", origin: "http://localhost:3005", want: true},
		{name: "localhost with no port", origin: "http://localhost", want: true},
		{name: "https localhost with port", origin: "https://localhost:1234", want: true},
		{name: "loopback IPv4 with port", origin: "http://127.0.0.1:8080", want: true},
		{name: "loopback IPv6 with port", origin: "http://[::1]:3000", want: true},

		// --- must reject ---
		{name: "unrelated domain", origin: "http://evil.com", want: false},
		{name: "subdomain suffix bypass", origin: "https://localhost.evil.com", want: false},
		{name: "hostname merely containing localhost", origin: "http://notlocalhost", want: false},
		{name: "file scheme", origin: "file:///etc/passwd", want: false},
		{name: "ftp scheme on localhost host", origin: "ftp://localhost", want: false},
		{name: "empty string", origin: "", want: false},
		{name: "no scheme", origin: "localhost:3000", want: false},
		{name: "malformed url.Parse error (control char)", origin: "http://loc alhost\x7f", want: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isLocalhost(tt.origin)
			if got != tt.want {
				t.Errorf("isLocalhost(%q) = %v, want %v", tt.origin, got, tt.want)
			}
		})
	}
}

// testConfig returns a minimal Config for New(). WebhookURL is set to an
// invalid placeholder host: most tests in this file never reach the contact
// handler at all, and the rate-limit tests below that do (via
// contactRouterWithWebhook) override it with a real fake-webhook server URL,
// so this default is never actually dialed.
func testConfig(allowedOrigins []string, allowAnyLocalhost bool) config.Config {
	return config.Config{
		WebhookURL:        "http://example.invalid/webhook",
		Port:              8080,
		AllowedOrigins:    allowedOrigins,
		AllowAnyLocalhost: allowAnyLocalhost,
	}
}

func TestHealthz(t *testing.T) {
	router := New(testConfig([]string{"https://example.com"}, false))

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /healthz: status = %d, want %d", rec.Code, http.StatusOK)
	}
	const wantBody = `{"status":"ok"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("GET /healthz: body = %q, want %q", got, wantBody)
	}
}

// TestRoot_RespondsPromptly is a regression guard for the 5-second sleep
// Sprint 1 removed from this handler (commit 5360e1e). A future
// reintroduction of any blocking delay here should fail this test long
// before a human notices the site is slow.
func TestRoot_RespondsPromptly(t *testing.T) {
	router := New(testConfig([]string{"https://example.com"}, false))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	start := time.Now()
	router.ServeHTTP(rec, req)
	elapsed := time.Since(start)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /: status = %d, want %d", rec.Code, http.StatusOK)
	}
	const budget = 500 * time.Millisecond
	if elapsed > budget {
		t.Errorf("GET /: took %v, want under %v (regression guard for the 5s sleep removed in Sprint 1)", elapsed, budget)
	}
}

// preflightRequest builds a CORS preflight OPTIONS request the way a real
// browser sends one: Origin plus Access-Control-Request-Method are both
// required for gin-contrib/cors to recognize it as a preflight at all.
// Without Access-Control-Request-Method, the middleware treats it as a
// plain OPTIONS request and these assertions would pass for the wrong
// reason.
func preflightRequest(target, origin string) *http.Request {
	req := httptest.NewRequest(http.MethodOptions, target, nil)
	req.Header.Set("Origin", origin)
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	return req
}

// TestCORS_DisallowedOriginNotEchoed pins that, with an explicit allow-list
// and AllowAnyLocalhost false (the production/deployed configuration), a
// preflight from an origin outside that list never gets its own origin
// echoed back in Access-Control-Allow-Origin. That header is what a browser
// checks to decide whether to release the response to the page's JS.
func TestCORS_DisallowedOriginNotEchoed(t *testing.T) {
	router := New(testConfig([]string{"https://example.com"}, false))

	req := preflightRequest("/api/v1/contact", "https://evil.com")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got == "https://evil.com" {
		t.Errorf("OPTIONS preflight from disallowed origin https://evil.com: Access-Control-Allow-Origin = %q, want it not to echo the disallowed origin", got)
	}
}

// TestCORS_AllowAnyLocalhost_RandomPort proves the local-dev escape hatch
// works for a port that isn't in any static allow-list, which is the entire
// reason AllowAnyLocalhost exists (see Config.AllowAnyLocalhost doc comment
// — Vite drifts to another port when 3005 is taken).
func TestCORS_AllowAnyLocalhost_RandomPort(t *testing.T) {
	router := New(testConfig(nil, true))

	const origin = "http://localhost:54321" // an arbitrary, never-configured port
	req := preflightRequest("/api/v1/contact", origin)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != origin {
		t.Errorf("OPTIONS preflight from %s with AllowAnyLocalhost=true: Access-Control-Allow-Origin = %q, want %q", origin, got, origin)
	}
}

// --- B1: rate limiting wired onto POST /api/v1/contact ---
//
// The token-bucket algorithm itself (refill, per-key independence, stale
// eviction, concurrency) is unit tested with an injected fake clock in
// internal/ratelimit. These tests only prove the wiring: New() actually
// applies the limiter to the contact route, in the right shape, and nowhere
// else.

// contactBody is a minimal, valid contact payload - these tests care about
// the rate limiter, not field validation.
func contactBody(t *testing.T) []byte {
	t.Helper()
	body, err := json.Marshal(map[string]string{
		"name":    "Ada Lovelace",
		"email":   "ada@example.com",
		"message": "hello",
	})
	if err != nil {
		t.Fatalf("json.Marshal contact body: %v", err)
	}
	return body
}

// postContactFrom posts a valid contact submission from remoteAddr (the
// simulated direct TCP peer). The rate limiter keys on the rightmost
// X-Forwarded-For entry and falls back to RemoteAddr's host when that header
// is absent, which is exactly what lets these tests simulate distinct visitor
// IPs without touching the header. Note this deliberately does not go through
// gin's ClientIP(): see internal/ratelimit/middleware.go for why.
func postContactFrom(router *gin.Engine, remoteAddr string, body []byte) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/contact", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.RemoteAddr = remoteAddr
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// contactRouterWithWebhook builds a router wired to a fake webhook that
// always succeeds, so a request only fails here if the rate limiter (or
// something else in front of the handler) rejects it.
func contactRouterWithWebhook(t *testing.T) *gin.Engine {
	t.Helper()
	webhook := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(webhook.Close)

	cfg := testConfig([]string{"https://example.com"}, false)
	cfg.WebhookURL = webhook.URL
	return New(cfg)
}

// TestRateLimit_ContactEndpoint_BurstThenBlocked drives exactly the
// configured burst (5) of requests from one IP through the real route
// wiring and confirms they all succeed, then that the very next request is
// rejected with 429, the contract's error body, and a positive Retry-After
// header.
func TestRateLimit_ContactEndpoint_BurstThenBlocked(t *testing.T) {
	router := contactRouterWithWebhook(t)
	body := contactBody(t)
	const ip = "203.0.113.10:1"

	for i := 1; i <= contactRateBurst; i++ {
		rec := postContactFrom(router, ip, body)
		if rec.Code != http.StatusOK {
			t.Fatalf("request #%d of %d (within burst): status = %d, want %d; body: %s", i, contactRateBurst, rec.Code, http.StatusOK, rec.Body.String())
		}
	}

	rec := postContactFrom(router, ip, body)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("request #%d (burst exhausted): status = %d, want %d; body: %s", contactRateBurst+1, rec.Code, http.StatusTooManyRequests, rec.Body.String())
	}

	const wantBody = `{"error":"too many requests"}`
	if got := rec.Body.String(); got != wantBody {
		t.Errorf("429 response body = %q, want %q (pinning the exact error shape ratelimit.Middleware writes)", got, wantBody)
	}

	retryAfter := rec.Header().Get("Retry-After")
	if retryAfter == "" {
		t.Fatal("429 response: Retry-After header is missing, want it set per the contract")
	}
	seconds, err := strconv.Atoi(retryAfter)
	if err != nil {
		t.Fatalf("429 response: Retry-After = %q is not an integer number of seconds: %v", retryAfter, err)
	}
	if seconds <= 0 {
		t.Errorf("429 response: Retry-After = %d seconds, want a positive value", seconds)
	}
}

// TestRateLimit_PerIPIndependent proves one IP being rate limited does not
// affect a different IP hitting the same route. Like postContactFrom above,
// this keys on RemoteAddr via the rate limiter's own clientKey resolution
// (no X-Forwarded-For is set here), not gin's ClientIP().
func TestRateLimit_PerIPIndependent(t *testing.T) {
	router := contactRouterWithWebhook(t)
	body := contactBody(t)

	const exhaustedIP = "203.0.113.20:1"
	for i := 1; i <= contactRateBurst; i++ {
		if rec := postContactFrom(router, exhaustedIP, body); rec.Code != http.StatusOK {
			t.Fatalf("priming %s, request #%d: status = %d, want %d", exhaustedIP, i, rec.Code, http.StatusOK)
		}
	}
	if rec := postContactFrom(router, exhaustedIP, body); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("test setup: %s should now be rate limited, got status %d", exhaustedIP, rec.Code)
	}

	const freshIP = "203.0.113.21:1"
	rec := postContactFrom(router, freshIP, body)
	if rec.Code != http.StatusOK {
		t.Fatalf("a different IP (%s): status = %d, want %d — one IP's rate limit must not affect another", freshIP, rec.Code, http.StatusOK)
	}
}

// TestRateLimit_HealthzNeverLimited is B4's verification: /healthz must not
// sit behind the contact rate limiter, or devops's ~10-minute keep-alive
// ping (fine on its own) plus any burst of real contact-form traffic could
// tip /healthz into 429 - a self-inflicted outage on the endpoint that
// exists to prove the service is up.
func TestRateLimit_HealthzNeverLimited(t *testing.T) {
	router := contactRouterWithWebhook(t)
	body := contactBody(t)
	const ip = "203.0.113.30:1"

	// Exhaust the contact limiter for this IP...
	for i := 1; i <= contactRateBurst; i++ {
		postContactFrom(router, ip, body)
	}
	if rec := postContactFrom(router, ip, body); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("test setup: contact endpoint should now be rate limited for %s, got status %d", ip, rec.Code)
	}

	// ...then hit /healthz repeatedly from the very same IP.
	for i := 1; i <= contactRateBurst*3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
		req.RemoteAddr = ip
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("GET /healthz call #%d from an IP whose contact-endpoint budget is exhausted: status = %d, want %d (healthz must never be rate limited)", i, rec.Code, http.StatusOK)
		}
	}
}
