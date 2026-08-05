package config

import (
	"os"
	"slices"
	"strings"
	"testing"
)

// baseEnv sets the minimum viable environment (PORT + WEBHOOK_URL) so each
// test can override just the variable it cares about.
func baseEnv(t *testing.T) {
	t.Helper()
	t.Setenv("PORT", "8080")
	t.Setenv("WEBHOOK_URL", "https://discord.com/api/webhooks/x/y")
}

// unsetEnv guarantees key is absent from the environment for the duration of
// the test and restores whatever value (if any) it had afterwards. t.Setenv
// alone cannot represent "absent" (only "set to this string"), and this
// package's "missing var" behavior must not depend on the ambient shell
// environment happening not to have PORT or WEBHOOK_URL set.
func unsetEnv(t *testing.T, key string) {
	t.Helper()
	old, existed := os.LookupEnv(key)
	if err := os.Unsetenv(key); err != nil {
		t.Fatalf("os.Unsetenv(%q): %v", key, err)
	}
	t.Cleanup(func() {
		if existed {
			os.Setenv(key, old)
		}
	})
}

// isZeroConfig reports whether cfg is the zero Config{}. Config is not
// comparable with == because it embeds a slice, so this checks field by
// field instead.
func isZeroConfig(cfg Config) bool {
	return cfg.WebhookURL == "" && cfg.Port == 0 && cfg.GHToken == "" &&
		len(cfg.AllowedOrigins) == 0 && !cfg.AllowAnyLocalhost
}

func TestLoad_MissingPort(t *testing.T) {
	unsetEnv(t, "PORT")
	t.Setenv("WEBHOOK_URL", "https://discord.com/api/webhooks/x/y")

	cfg, err := Load()
	if err == nil {
		t.Fatalf("Load() with PORT unset: got nil error, want error mentioning PORT")
	}
	if !strings.Contains(err.Error(), "PORT") {
		t.Errorf("Load() with PORT unset: error = %q, want it to mention PORT", err.Error())
	}
	if !isZeroConfig(cfg) {
		t.Errorf("Load() with PORT unset: cfg = %+v, want zero Config{} (pinning current behavior: PORT failure returns a zero Config, unlike the WEBHOOK_URL failure below which returns a populated one)", cfg)
	}
}

func TestLoad_NonNumericPort(t *testing.T) {
	tests := []struct {
		name string
		port string
	}{
		{name: "letters", port: "abc"},
		{name: "empty string", port: ""},
		{name: "trailing garbage", port: "8080x"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("PORT", tt.port)
			t.Setenv("WEBHOOK_URL", "https://discord.com/api/webhooks/x/y")

			_, err := Load()
			if err == nil {
				t.Fatalf("Load() with PORT=%q: got nil error, want error", tt.port)
			}
			if !strings.Contains(err.Error(), "PORT") {
				t.Errorf("Load() with PORT=%q: error = %q, want it to mention PORT", tt.port, err.Error())
			}
		})
	}
}

func TestLoad_MissingWebhookURL(t *testing.T) {
	t.Setenv("PORT", "8080")
	unsetEnv(t, "WEBHOOK_URL")

	cfg, err := Load()
	if err == nil {
		t.Fatalf("Load() with WEBHOOK_URL unset: got nil error, want error mentioning WEBHOOK_URL")
	}
	if !strings.Contains(err.Error(), "WEBHOOK_URL") {
		t.Errorf("Load() with WEBHOOK_URL unset: error = %q, want it to mention WEBHOOK_URL", err.Error())
	}
	// Pin the current (inconsistent) behavior: unlike the PORT-missing case,
	// this path returns a *populated* cfg alongside the error because PORT
	// parsed successfully before the WEBHOOK_URL check ran. See report: this
	// asymmetry (zero Config on PORT failure, populated Config on
	// WEBHOOK_URL failure) is a real inconsistency worth flagging, not fixing.
	if cfg.Port != 8080 {
		t.Errorf("Load() with WEBHOOK_URL unset: cfg.Port = %d, want 8080 (cfg is populated despite the error on this path)", cfg.Port)
	}
	if isZeroConfig(cfg) {
		t.Errorf("Load() with WEBHOOK_URL unset: cfg is the zero Config, want a populated Config (this pins the asymmetry with the PORT-missing case)")
	}
}

func TestLoad_AllowedOriginsUnset(t *testing.T) {
	baseEnv(t)
	unsetEnv(t, "ALLOWED_ORIGINS")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() with ALLOWED_ORIGINS unset: unexpected error: %v", err)
	}
	if !slices.Equal(cfg.AllowedOrigins, defaultAllowedOrigins) {
		t.Errorf("Load() with ALLOWED_ORIGINS unset: AllowedOrigins = %v, want package defaults %v", cfg.AllowedOrigins, defaultAllowedOrigins)
	}
	if !cfg.AllowAnyLocalhost {
		t.Errorf("Load() with ALLOWED_ORIGINS unset: AllowAnyLocalhost = false, want true")
	}
}

func TestLoad_AllowedOriginsSet(t *testing.T) {
	baseEnv(t)
	t.Setenv("ALLOWED_ORIGINS", "https://example.com,https://foo.example.com")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() with ALLOWED_ORIGINS set: unexpected error: %v", err)
	}

	want := []string{"https://example.com", "https://foo.example.com"}
	if !slices.Equal(cfg.AllowedOrigins, want) {
		t.Errorf("Load() with ALLOWED_ORIGINS=%q: AllowedOrigins = %v, want %v", "https://example.com,https://foo.example.com", cfg.AllowedOrigins, want)
	}
	if cfg.AllowAnyLocalhost {
		t.Errorf("Load() with ALLOWED_ORIGINS set: AllowAnyLocalhost = true, want false (explicit origins mean exact matching only)")
	}
}

func TestLoad_AllowedOriginsWhitespaceAndEmptyEntries(t *testing.T) {
	baseEnv(t)
	raw := " a , , b "
	t.Setenv("ALLOWED_ORIGINS", raw)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() with ALLOWED_ORIGINS=%q: unexpected error: %v", raw, err)
	}

	want := []string{"a", "b"}
	if !slices.Equal(cfg.AllowedOrigins, want) {
		t.Errorf("Load() with ALLOWED_ORIGINS=%q: AllowedOrigins = %v, want %v (whitespace trimmed, empty entries dropped)", raw, cfg.AllowedOrigins, want)
	}
	if cfg.AllowAnyLocalhost {
		t.Errorf("Load() with ALLOWED_ORIGINS=%q: AllowAnyLocalhost = true, want false (non-empty explicit list was provided)", raw)
	}
}

// TestLoad_AllowedOriginsSetButUnusable covers the fix for the bug pinned by
// the previous version of this test: when ALLOWED_ORIGINS is explicitly set
// but parses to zero usable origins (e.g. " , , "), Load() used to be unable
// to distinguish that from "unset" and would silently fall back to the
// package defaults AND flip AllowAnyLocalhost to true — downgrading a
// misconfigured production deploy to dev-permissive CORS. Load() now uses
// os.LookupEnv to tell "set" apart from "unset" and returns an error (and a
// zero Config) whenever the variable is set but useless, including the empty
// string — see TEAM-BRIEF.md for why "" is deliberately an error rather than
// falling through to defaults.
func TestLoad_AllowedOriginsSetButUnusable(t *testing.T) {
	tests := []struct {
		name string
		raw  string
	}{
		{name: "only commas and whitespace", raw: " , , "},
		{name: "single comma", raw: ","},
		{name: "only whitespace", raw: "   "},
		{name: "empty string", raw: ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			baseEnv(t)
			t.Setenv("ALLOWED_ORIGINS", tt.raw)

			cfg, err := Load()
			if err == nil {
				t.Fatalf("Load() with ALLOWED_ORIGINS=%q: got nil error, want error mentioning ALLOWED_ORIGINS", tt.raw)
			}
			if !strings.Contains(err.Error(), "ALLOWED_ORIGINS") {
				t.Errorf("Load() with ALLOWED_ORIGINS=%q: error = %q, want it to mention ALLOWED_ORIGINS", tt.raw, err.Error())
			}
			if !isZeroConfig(cfg) {
				t.Errorf("Load() with ALLOWED_ORIGINS=%q: cfg = %+v, want zero Config{} on error", tt.raw, cfg)
			}
		})
	}
}
