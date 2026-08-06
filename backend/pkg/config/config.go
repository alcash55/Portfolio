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

// defaultProjectRepos is used when PROJECT_REPOS is unset: the current
// curated order for the Projects section. None of these repos carry GitHub
// topics (verified against the live API), so curation is this explicit
// allow-list rather than a topic filter.
var defaultProjectRepos = []string{
	"Little-Town",
	"ac-composite-actions",
	"Royalty-VS-Code-Theme",
	"Portfolio",
}

type Config struct {
	WebhookURL     string   `env:"WEBHOOK_URL"`
	Port           int      `env:"PORT"`
	GHToken        string   `env:"GH_TOKEN"`
	AllowedOrigins []string `env:"ALLOWED_ORIGINS"`
	ProjectRepos   []string `env:"PROJECT_REPOS"`

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

	origins, usingDefaultOrigins, err := resolveCommaList("ALLOWED_ORIGINS", defaultAllowedOrigins)
	if err != nil {
		return Config{}, err
	}

	projectRepos, _, err := resolveCommaList("PROJECT_REPOS", defaultProjectRepos)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		WebhookURL:        os.Getenv("WEBHOOK_URL"),
		Port:              port,
		GHToken:           os.Getenv("GH_TOKEN"),
		AllowedOrigins:    origins,
		ProjectRepos:      projectRepos,
		AllowAnyLocalhost: usingDefaultOrigins,
	}

	// GH_TOKEN is optional: the /api/v1/projects handler (internal/handlers/
	// projects) reads it, but sends requests unauthenticated when it's empty
	// rather than failing to boot. render.yaml declares the key with
	// sync: false, so whether a value actually exists depends on the Render
	// dashboard - requiring it here would let an unset dashboard field stop
	// the live API from booting, a self-inflicted outage over a token that
	// only raises a rate limit the endpoint comes nowhere near.
	for _, env := range []string{"WEBHOOK_URL"} {
		if os.Getenv(env) == "" {
			return Config{}, fmt.Errorf("%s is required", env)
		}
	}

	return cfg, nil
}

// resolveCommaList reads envVar as a comma-separated list, following the
// ALLOWED_ORIGINS precedent: unset falls back to defaults (usingDefaults =
// true), but set-but-parses-to-nothing-usable (e.g. "", ",", " , , ") is a
// configuration error, not a silent fallback. That case is most likely a
// broken deploy-time template substitution; falling back to defaults would
// silently downgrade a curated production setting instead of surfacing the
// misconfiguration.
func resolveCommaList(envVar string, defaults []string) (values []string, usingDefaults bool, err error) {
	raw, isSet := os.LookupEnv(envVar)
	if !isSet {
		return slices.Clone(defaults), true, nil
	}

	values = splitCommaList(raw)
	if len(values) == 0 {
		return nil, false, fmt.Errorf("%s is set but contains no usable values: %q", envVar, raw)
	}
	return values, false, nil
}

// splitCommaList splits a comma-separated string, trimming whitespace and
// dropping empty entries. It returns an empty slice when raw is unset or
// contains nothing usable, leaving the caller to decide what that means.
func splitCommaList(raw string) []string {
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, v := range parts {
		if v = strings.TrimSpace(v); v != "" {
			values = append(values, v)
		}
	}

	return values
}
