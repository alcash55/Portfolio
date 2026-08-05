package config

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
)

// defaultAllowedOrigins is used when ALLOWED_ORIGINS is unset: the Vite dev
// server (port 3005, see frontend/vite.config.ts), `vite preview`, and the
// GitHub Pages deployment.
var defaultAllowedOrigins = []string{
	"http://localhost:3005",
	"http://127.0.0.1:3005",
	"http://localhost:4173",
	"https://alcash55.github.io",
}

type Config struct {
	WebhookURL     string   `env:"WEBHOOK_URL"`
	Port           int      `env:"PORT"`
	GHToken        string   `env:"GH_TOKEN"`
	AllowedOrigins []string `env:"ALLOWED_ORIGINS"`

	// AllowAnyLocalhost is true when ALLOWED_ORIGINS was not set, which only
	// happens in local development. Dev servers drift to another port when
	// theirs is taken (Vite does this silently unless strictPort is set), so
	// pinning exact localhost ports turns into whack-a-mole. Deployments set
	// ALLOWED_ORIGINS explicitly and stay on exact matching.
	AllowAnyLocalhost bool
}

func Load() (Config, error) {
	port, err := strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		return Config{}, fmt.Errorf("PORT is required: %w", err)
	}

	rawOrigins, originsSet := os.LookupEnv("ALLOWED_ORIGINS")

	var origins []string
	var usingDefaults bool
	if !originsSet {
		// Genuinely unset: this is the local-dev path.
		origins = slices.Clone(defaultAllowedOrigins)
		usingDefaults = true
	} else {
		origins = parseOrigins(rawOrigins)
		if len(origins) == 0 {
			// Set but parses to nothing usable (e.g. "", ",", " , , ", "   ").
			// This is most likely a broken deploy-time template substitution;
			// falling back to permissive defaults would silently downgrade
			// production CORS, so treat it as a configuration error instead.
			return Config{}, fmt.Errorf("ALLOWED_ORIGINS is set but contains no usable origins: %q", rawOrigins)
		}
	}

	cfg := Config{
		WebhookURL:        os.Getenv("WEBHOOK_URL"),
		Port:              port,
		GHToken:           os.Getenv("GH_TOKEN"),
		AllowedOrigins:    origins,
		AllowAnyLocalhost: usingDefaults,
	}

	// GH_TOKEN is optional: it is loaded for future use but nothing reads it
	// yet, so requiring it would block deploys for no reason.
	for _, env := range []string{"WEBHOOK_URL"} {
		if os.Getenv(env) == "" {
			return cfg, fmt.Errorf("%s is required", env)
		}
	}

	return cfg, nil
}

// parseOrigins splits a comma-separated origin list. It returns an empty slice
// when the value is unset or contains nothing usable, leaving the caller to
// decide whether that means "use the defaults".
func parseOrigins(raw string) []string {
	origins := make([]string, 0, len(defaultAllowedOrigins))
	for _, origin := range strings.Split(raw, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}

	return origins
}
