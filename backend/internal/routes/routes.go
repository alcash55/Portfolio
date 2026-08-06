package routes

import (
	"net/http"
	"net/url"
	"slices"
	"time"

	"github.com/alcash55/Portfolio/internal/handlers/contact"
	"github.com/alcash55/Portfolio/internal/ratelimit"
	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// contactRateLimit is the budget for POST /api/v1/contact: a human sends one
// message, so 5 requests/minute per IP with a burst of 5 never throttles
// real traffic while still bounding how fast the endpoint's permanently
// public Discord webhook URL can be hammered.
const (
	contactRateLimit      = 5
	contactRateWindow     = time.Minute
	contactRateBurst      = 5
	contactRateStaleAfter = 10 * time.Minute // well past one full refill (1 window); safe to forget an idle IP after this
	contactRateSweepEvery = 256              // lazy eviction on ordinary traffic; no ticker goroutine needed
)

// isLocalhost reports whether origin points at the local machine, on any port.
func isLocalhost(origin string) bool {
	u, err := url.Parse(origin)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") {
		return false
	}

	switch u.Hostname() {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}

// New builds the application router with all middleware and routes attached.
func New(cfg config.Config) *gin.Engine {
	router := gin.Default()

	// No explicit router.SetTrustedProxies() call here, deliberately.
	//
	// It was added for an earlier version of the B1 rate limiter, which
	// keyed on gin's c.ClientIP(). That turned out to be a real bypass:
	// trusting every peer (the only option, since Render's proxy IP isn't a
	// published, stable range to pin to) also trusts every entry *inside*
	// X-Forwarded-For, so ClientIP() walks to the LEFTMOST entry - the one
	// fully under the client's control. Verified empirically: rotating a
	// forged header defeated the limiter completely (0/40 requests
	// blocked). The rate limiter (internal/ratelimit) no longer depends on
	// trusted-proxy config at all - it extracts its own key directly from
	// the header (see ratelimit.clientKey), taking the rightmost entry,
	// which a client cannot influence.
	//
	// Worth keeping as a note for whoever looks at this next: gin's own
	// New()/Default() already default trustedCIDRs to 0.0.0.0/0 and ::/0
	// (confirmed by reading gin.go) - so calling SetTrustedProxies with
	// those same values, as this code used to, was never actually changing
	// gin's behavior; it only made an existing default explicit. That
	// default still applies to any other c.ClientIP() consumer (currently
	// just gin's own access-log Logger middleware), which is a low-stakes,
	// informational-only use of a spoofable value.

	corsConfig := cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	// Local development only - see Config.AllowAnyLocalhost.
	if cfg.AllowAnyLocalhost {
		corsConfig.AllowOriginFunc = func(origin string) bool {
			return isLocalhost(origin) || slices.Contains(cfg.AllowedOrigins, origin)
		}
	}

	router.Use(cors.New(corsConfig))

	router.GET("/", func(c *gin.Context) {
		c.String(http.StatusOK, "Welcome the portfolio server")
	})

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	contactHandler := contact.New(cfg)

	// One instance on Render, so an in-process limiter needs no shared
	// store. Built fresh per call to New() rather than as a package-level
	// var so each router (and, in production, the one process) owns an
	// independent bucket map.
	contactLimiter := ratelimit.New(ratelimit.Config{
		Rate:       contactRateLimit,
		Burst:      contactRateBurst,
		Window:     contactRateWindow,
		StaleAfter: contactRateStaleAfter,
		SweepEvery: contactRateSweepEvery,
	})

	api := router.Group("/api")
	{
		// /api/v1
		v1 := api.Group("/v1")
		{
			// /api/v1/contact - rate limited; deliberately not applied to
			// /healthz or /, since the keep-alive workflow that pings /healthz
			// every ~10 minutes to stop Render's free plan from spinning down
			// (.github/workflows/keep-alive.yml) must never be able to trip a
			// 429 on the one endpoint that exists to prove the service is up.
			contactRoutes := v1.Group("/contact")
			contactRoutes.POST("", ratelimit.Middleware(contactLimiter), contactHandler.SendMessage)
		}
	}

	return router
}
