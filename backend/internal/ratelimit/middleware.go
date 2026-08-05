package ratelimit

import (
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// Middleware returns gin middleware that rate-limits requests, keyed by
// c.ClientIP(), using l. Wire it onto the specific route(s) that need
// protecting - not globally - so unrelated routes such as /healthz are never
// throttled by it.
//
// c.ClientIP() honoring X-Forwarded-For depends on the engine's trusted
// proxies being configured (see routes.New); that configuration, and the
// spoofing tradeoff it accepts, is documented there rather than here.
func Middleware(l *Limiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		allowed, retryAfter := l.Allow(c.ClientIP())
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
