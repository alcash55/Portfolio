package ratelimit

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// newContext builds a *gin.Context wrapping a GET request with remoteAddr as
// the direct TCP peer and, if non-empty, xff as the X-Forwarded-For header -
// enough to exercise clientKey without needing a full router.
func newContext(remoteAddr, xff string) *gin.Context {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = remoteAddr
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	c.Request = req
	return c
}

// TestClientKey pins the exact selection rule clientKey implements, in
// isolation from any router or limiter. This is the logic that regressed
// once already (leftmost instead of rightmost) and let a forged header
// bypass the whole rate limiter, so each case documents specifically what
// it is guarding against.
func TestClientKey(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		xff        string
		want       string
	}{
		{
			name:       "no XFF header falls back to RemoteAddr host",
			remoteAddr: "192.0.2.1:54321",
			xff:        "",
			want:       "192.0.2.1",
		},
		{
			name:       "single XFF entry is used as-is",
			remoteAddr: "192.0.2.1:54321", // Render's own edge, not the visitor
			xff:        "203.0.113.5",
			want:       "203.0.113.5",
		},
		{
			name:       "multiple entries: rightmost (proxy-appended) wins, not leftmost (client-controlled)",
			remoteAddr: "192.0.2.1:54321",
			xff:        "203.0.113.5, 198.51.100.9",
			want:       "198.51.100.9",
		},
		{
			name:       "attacker-forged leading entry does not displace the real one Render appended",
			remoteAddr: "192.0.2.1:54321",
			xff:        "1.2.3.4-totally-fake-forged-by-the-client, 198.51.100.9",
			want:       "198.51.100.9",
		},
		{
			name:       "extra whitespace around entries is trimmed",
			remoteAddr: "192.0.2.1:54321",
			xff:        "203.0.113.5 ,  198.51.100.9  ",
			want:       "198.51.100.9",
		},
		{
			name:       "trailing comma with an empty last entry falls back to the last non-empty one",
			remoteAddr: "192.0.2.1:54321",
			xff:        "203.0.113.5, 198.51.100.9, ",
			want:       "198.51.100.9",
		},
		{
			name:       "RemoteAddr without a port is used verbatim",
			remoteAddr: "192.0.2.1",
			xff:        "",
			want:       "192.0.2.1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := newContext(tt.remoteAddr, tt.xff)
			if got := clientKey(c); got != tt.want {
				t.Errorf("clientKey() with RemoteAddr=%q, X-Forwarded-For=%q: got %q, want %q", tt.remoteAddr, tt.xff, got, tt.want)
			}
		})
	}
}

// contactStyleRouter builds a minimal router matching how routes.New wires
// the contact route's rate limiter: Middleware on a single POST route, real
// (non-fake) clock, small burst so tests run fast.
func contactStyleRouter(l *Limiter) *gin.Engine {
	r := gin.New()
	r.POST("/api/v1/contact", Middleware(l), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	return r
}

func postFrom(router *gin.Engine, remoteAddr, xff string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(http.MethodPost, "/api/v1/contact", nil)
	req.RemoteAddr = remoteAddr
	if xff != "" {
		req.Header.Set("X-Forwarded-For", xff)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

// TestMiddleware_RotatingForgedXFF_StillGetsRateLimited is the regression
// test for the bypass found in review: exhausting the bucket with a FIXED
// X-Forwarded-For correctly returned 429, but rotating a new forged value
// per request defeated the limiter completely (0 of 40 requests blocked),
// because the old code keyed on gin's c.ClientIP(), which - with trusted
// proxies necessarily set to "trust everyone" - walks to the LEFTMOST
// (fully client-controlled) header entry.
//
// This simulates the realistic shape of the header once it has passed
// through Render: whatever the attacker sets, plus the real connecting
// address Render itself appends as the last entry. The forged prefix
// changes on every request; the appended real address does not, matching a
// single attacker script varying one header.
func TestMiddleware_RotatingForgedXFF_StillGetsRateLimited(t *testing.T) {
	l := New(Config{Rate: 5, Burst: 5, Window: time.Minute, StaleAfter: 10 * time.Minute})
	router := contactStyleRouter(l)

	const (
		renderEdgeAddr = "10.0.0.1:443" // Render's own proxy: the TCP peer for every request
		attackerRealIP = "198.51.100.9" // what Render actually appended - the attacker's one real machine
		burst          = 5
		totalAttempts  = 40 // matches the reviewer's empirical repro
	)

	var blocked int
	for i := 0; i < totalAttempts; i++ {
		forgedPrefix := fmt.Sprintf("10.10.10.%d", i) // a new, distinct forged value every request
		xff := forgedPrefix + ", " + attackerRealIP
		rec := postFrom(router, renderEdgeAddr, xff)
		if rec.Code == http.StatusTooManyRequests {
			blocked++
		} else if rec.Code != http.StatusOK {
			t.Fatalf("request #%d: unexpected status %d, want %d or %d; body: %s", i, rec.Code, http.StatusOK, http.StatusTooManyRequests, rec.Body.String())
		}
	}

	if blocked == 0 {
		t.Fatalf("sent %d requests from one real client rotating a forged X-Forwarded-For prefix on every request (burst=%d): 0 were rate limited — "+
			"a forged, rotating header bypassed the limiter entirely, exactly the bug this test exists to catch", totalAttempts, burst)
	}
	if want := totalAttempts - burst; blocked != want {
		t.Errorf("sent %d requests from one real client rotating a forged prefix (burst=%d): %d were blocked, want exactly %d (everything past the burst)", totalAttempts, burst, blocked, want)
	}
}

// TestMiddleware_DifferentRealClientsIndependent proves the fix does not
// overcorrect into treating every visitor as one shared client: two
// distinct real addresses (as Render would append them) must still get
// independent buckets, including when both send some forged prefix.
func TestMiddleware_DifferentRealClientsIndependent(t *testing.T) {
	l := New(Config{Rate: 5, Burst: 5, Window: time.Minute, StaleAfter: 10 * time.Minute})
	router := contactStyleRouter(l)

	const renderEdgeAddr = "10.0.0.1:443"

	exhaust := func(realIP string) {
		for i := 0; i < 5; i++ {
			xff := fmt.Sprintf("forged-%d, %s", i, realIP)
			if rec := postFrom(router, renderEdgeAddr, xff); rec.Code != http.StatusOK {
				t.Fatalf("priming %s, request #%d: status = %d, want %d", realIP, i, rec.Code, http.StatusOK)
			}
		}
	}

	exhaust("203.0.113.11")
	if rec := postFrom(router, renderEdgeAddr, "forged-x, 203.0.113.11"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("test setup: 203.0.113.11 should now be rate limited, got status %d", rec.Code)
	}

	// A different real client (still behind a forged prefix) must not be
	// affected by the first client's exhausted bucket.
	rec := postFrom(router, renderEdgeAddr, "forged-y, 203.0.113.12")
	if rec.Code != http.StatusOK {
		t.Fatalf("a different real client (203.0.113.12): status = %d, want %d — one client's rate limit must not affect another, even with both behind forged prefixes", rec.Code, http.StatusOK)
	}
}
