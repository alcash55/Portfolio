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
	ResumeGHToken  string   `env:"RESUME_GH_TOKEN"`
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
		ResumeGHToken:     os.Getenv("RESUME_GH_TOKEN"),
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
	//
	// RESUME_GH_TOKEN is a separate variable from GH_TOKEN, not a reused one,
	// and is optional for the same boot-safety reason. The two tokens serve
	// different repos with different privacy: GH_TOKEN's only job today is
	// raising the projects handler's rate limit against public repos, and
	// that handler already degrades to an unauthenticated call if the token
	// is missing or rejected. The Resume repo is private, so a token good
	// enough for /api/v1/resume must carry read access to it - a strictly
	// bigger grant than "raise a public rate limit". Reusing GH_TOKEN would
	// mean either widening that existing token's scope (so a public-repo
	// listing feature starts depending on a credential with private-repo
	// reach) or accepting that /api/v1/projects's graceful unauthenticated
	// fallback no longer describes what a rejected token actually costs.
	// Two tokens keep each endpoint's blast radius to the repos it reads.
	// See internal/handlers/resume for where this is consumed and
	// scripts/resume-token-wizard.sh for how Alex provisions it.
	//
	// The fallback below exists because that separation describes the token
	// Alex should end up with, not the one deployed today: GH_TOKEN is
	// currently a classic PAT carrying the `repo` scope, which already reads
	// the private Resume repo (verified 2026-09-15). Refusing to use it would
	// leave /api/v1/resume returning 502 purely to honor a boundary the
	// credential does not actually draw. RESUME_GH_TOKEN still wins when set,
	// so narrowing GH_TOKEN later is a dashboard change and not a code change.
	if cfg.ResumeGHToken == "" {
		cfg.ResumeGHToken = cfg.GHToken
	}
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
