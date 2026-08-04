package routes

import (
	"net/http"
	"net/url"
	"slices"
	"time"

	"github.com/alcash55/Portfolio/internal/handlers/contact"
	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
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

	api := router.Group("/api")
	{
		// /api/v1
		v1 := api.Group("/v1")
		{
			// /api/v1/contact
			contactRoutes := v1.Group("/contact")
			contactRoutes.POST("", contactHandler.SendMessage)
		}
	}

	return router
}
