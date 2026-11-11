package config

import (
	"fmt"
	"os"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// defaultAllowedOrigins is used when ALLOWED_ORIGINS is unset: the Vite dev
// server (port 3005, see frontend/vite.config.ts), `vite preview`, the
// Cloudflare Workers site, and the v1 site. v1 still serves from GitHub Pages
// at alcash55.github.io, so its requests to this API need that origin.
var defaultAllowedOrigins = []string{
	"http://localhost:3005",
	"http://127.0.0.1:3005",
	"http://localhost:4173",
	"https://portfolio-website.alex-e-cash28.workers.dev",
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
	GolemGHToken   string   `env:"GOLEM_GH_TOKEN"`
	GolemPinTag    string   `env:"GOLEM_PIN_TAG"`
	AllowedOrigins []string `env:"ALLOWED_ORIGINS"`
	ProjectRepos   []string `env:"PROJECT_REPOS"`

	// AllowAnyLocalhost is true when ALLOWED_ORIGINS was not set, which only
	// happens in local development. Dev servers drift to another port when
	// theirs is taken (Vite does this silently unless strictPort is set), so
	// pinning exact localhost ports turns into whack-a-mole. Deployments set
	// ALLOWED_ORIGINS explicitly and stay on exact matching.
	AllowAnyLocalhost bool
}

// Load reads configuration from the environment, first filling it from a
// local .env file if one exists (see loadEnv). Variables already set in the
// environment win over the file.
func Load() (Config, error) {
	loadEnv()
	return fromEnv()
}

// fromEnv parses and validates the environment as it stands, without
// touching any .env file. Split from Load so the parsing tests stay
// independent of whatever .env sits in the developer's checkout.
func fromEnv() (Config, error) {
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
		GolemGHToken:      os.Getenv("GOLEM_GH_TOKEN"),
		GolemPinTag:       strings.TrimSpace(os.Getenv("GOLEM_PIN_TAG")),
		AllowedOrigins:    origins,
		ProjectRepos:      projectRepos,
		AllowAnyLocalhost: usingDefaultOrigins,
	}

	// GH_TOKEN is optional: the /api/v1/projects handler degrades to an
	// unauthenticated call when it's empty rather than failing to boot. See
	// README.md's "Live resume data" and "Local development" sections for the
	// full token setup.
	//
	// RESUME_GH_TOKEN falls back to GH_TOKEN when unset, because GH_TOKEN
	// already carries read access to the private Resume repo. A dedicated,
	// narrower-scoped token is still preferred: a fine-grained PAT with read-only
	// Contents on alcash55/Resume, set in the Render dashboard.
	if cfg.ResumeGHToken == "" {
		cfg.ResumeGHToken = cfg.GHToken
	}
	// A pin that the golem handler would reject at request time is a typo, and
	// it would otherwise surface as a 502 on the play page. Fail the boot.
	if cfg.GolemPinTag != "" && !IsGolemTag(cfg.GolemPinTag) {
		return Config{}, fmt.Errorf("GOLEM_PIN_TAG must look like webgl-v1.0.6-abc123, got %q", cfg.GolemPinTag)
	}
	for _, env := range []string{"WEBHOOK_URL"} {
		if os.Getenv(env) == "" {
			return Config{}, fmt.Errorf("%s is required", env)
		}
	}

	return cfg, nil
}

// golemTag matches a Golem Miners production WebGL release tag, such as
// webgl-v1.0.6-8ae0558d8559-42903441642.1. The prefix is the contract with the
// game repo's release workflow. The character class keeps a tag safe to place
// in a URL path and a file name without escaping.
var golemTag = regexp.MustCompile(`^webgl-v[A-Za-z0-9._-]{1,120}$`)

// IsGolemTag reports whether tag is a well-formed Golem Miners production
// WebGL release tag. Config and the golem handler share it so a pin, a ?tag=
// query and a release GitHub reports are all held to the same rule.
func IsGolemTag(tag string) bool { return golemTag.MatchString(tag) }

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
