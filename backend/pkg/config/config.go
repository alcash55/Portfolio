package config

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
)

// defaultAllowedOrigins is used when ALLOWED_ORIGINS is unset: the Vite dev
// server (port 3000, see frontend/vite.config.ts), `vite preview`, and the
// GitHub Pages deployment.
var defaultAllowedOrigins = []string{
	"http://localhost:3000",
	"http://127.0.0.1:3000",
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

	origins := parseOrigins(os.Getenv("ALLOWED_ORIGINS"))
	usingDefaults := len(origins) == 0
	if usingDefaults {
		origins = slices.Clone(defaultAllowedOrigins)
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
