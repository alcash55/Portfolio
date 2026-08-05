package ratelimit

import (
	"math"
	"net"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// Middleware returns gin middleware that rate-limits requests, keyed by
// clientKey(c), using l. Wire it onto the specific route(s) that need
// protecting - not globally - so unrelated routes such as /healthz are never
// throttled by it.
func Middleware(l *Limiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed, retryAfter := l.Allow(clientKey(c))
		if !allowed {
			seconds := int(math.Ceil(retryAfter.Seconds()))
			if seconds < 1 {
				seconds = 1
			}
			c.Header("Retry-After", strconv.Itoa(seconds))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}

// clientKey derives the rate limiter's per-client identity for c's request.
//
// This deliberately does NOT use gin's c.ClientIP(). Render terminates TLS
// at its own reverse proxy, so honoring X-Forwarded-For at all requires
// trusting that proxy - but its IP isn't a published, stable range we can
// pin to, so the only option is to trust every peer (gin's own default is
// already exactly this: 0.0.0.0/0 and ::/0, confirmed by reading gin.go -
// nothing in this codebase needs to opt into it). Trusting every peer means
// ClientIP() also trusts every entry *inside* the header, so it walks all
// the way to the LEFTMOST entry - the one entirely under the client's
// control. Verified empirically against the merged limiter: a fixed forged
// X-Forwarded-For got rate limited correctly, but rotating a new forged
// value per request let 40/40 requests through unthrottled - a client-side,
// one-header bypass of the entire limiter.
//
// A reverse proxy appends the connecting peer's address as the last entry
// of X-Forwarded-For rather than replacing the header, so the RIGHTMOST
// entry is the one a client cannot influence: anything they prepend still
// sits to its left and is ignored here. This assumes Render's edge proxy
// appends (does not replace) X-Forwarded-For, and that it is the only hop
// in front of this process. If either assumption turns out to be wrong for
// Render specifically, this key stops being attacker-controllable but may
// no longer equal the visitor's real address either - that would need
// re-checking against Render's actual behavior, not guessed at here.
//
// What this does and does not guarantee: it defeats a client forging or
// rotating the header to evade its own bucket. It does NOT defend against
// an attacker with many genuine source addresses (e.g. a botnet) - that is
// out of scope for an in-memory, single-instance, per-IP limiter with no
// shared store.
func clientKey(c *gin.Context) string {
	if xff := c.Request.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		for i := len(parts) - 1; i >= 0; i-- {
			if entry := strings.TrimSpace(parts[i]); entry != "" {
				return entry
			}
		}
	}

	// No header at all: local development or a direct connection with
	// nothing in front of this process. Fall back to the TCP peer address.
	if host, _, err := net.SplitHostPort(c.Request.RemoteAddr); err == nil {
		return host
	}
	return c.Request.RemoteAddr
}
