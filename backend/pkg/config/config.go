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
}

func Load() (Config, error) {
	port, err := strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		return Config{}, fmt.Errorf("PORT is required: %w", err)
	}

	cfg := Config{
		WebhookURL:     os.Getenv("WEBHOOK_URL"),
		Port:           port,
		GHToken:        os.Getenv("GH_TOKEN"),
		AllowedOrigins: parseOrigins(os.Getenv("ALLOWED_ORIGINS")),
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

// parseOrigins splits a comma-separated origin list, falling back to the
// defaults when the value is unset or contains nothing usable.
func parseOrigins(raw string) []string {
	origins := make([]string, 0, len(defaultAllowedOrigins))
	for _, origin := range strings.Split(raw, ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			origins = append(origins, origin)
		}
	}

	if len(origins) == 0 {
		return slices.Clone(defaultAllowedOrigins)
	}

	return origins
}
