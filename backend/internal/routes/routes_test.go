package routes

import (
	"net/http"
	"net/http/httptest"
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

// testConfig returns a minimal Config for New(). WebhookURL is left empty
// since none of these route-level tests exercise the contact handler's
// webhook call (that is covered in internal/handlers/contact).
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
