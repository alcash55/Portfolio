package routes

import (
	"log"
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
// public Discord webhook URL can be hammered. See TEAM-BRIEF.md B1.
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

	// Render terminates TLS at its own reverse proxy, so every request this
	// process sees arrives from that proxy, not the visitor - the direct
	// peer address (what ClientIP() falls back to) would be Render's IP for
	// every visitor, putting the whole site in one rate-limit bucket.
	//
	// Trusting all peers here makes gin honor X-Forwarded-For so ClientIP()
	// returns the visitor's IP instead. Render's own proxy IP isn't a
	// published, stable range we could pin to instead, so this is as
	// specific as the trust config can get: the header is spoofable by
	// anyone willing to set it directly on a request. That's an accepted
	// tradeoff - it stops casual/naive flooding of the public contact-form
	// webhook, not a determined attacker forging the header. See
	// TEAM-BRIEF.md B1.
	if err := router.SetTrustedProxies([]string{"0.0.0.0/0", "::/0"}); err != nil {
		// Only returns an error for a malformed CIDR/IP in the literal list
		// above, so this can only fire if that list is edited incorrectly.
		log.Fatalf("routes: SetTrustedProxies: %v", err)
	}

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
			// /healthz or / (see TEAM-BRIEF.md B4: a keep-alive pinging its
			// own limiter into 429 would be a self-inflicted outage).
			contactRoutes := v1.Group("/contact")
			contactRoutes.POST("", ratelimit.Middleware(contactLimiter), contactHandler.SendMessage)
		}
	}

	return router
}
