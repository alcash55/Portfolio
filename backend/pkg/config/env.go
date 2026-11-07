package config

import (
	"log"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// loadEnv populates the process environment from a .env file for local
// development. godotenv resolves paths against the working directory, which
// differs between `go run ./cmd/app` (backend/) and an IDE run configuration
// (backend/cmd/app), so search upwards for the file instead of assuming it sits
// in the current directory. The walk stops at the module root so an unrelated
// .env higher up the filesystem can never be picked up.
//
// Real environment variables always win, so deployments - where no .env exists
// - are unaffected.
func loadEnv() {
	// The os.Getwd() error path below is intentionally untested. Triggering
	// it for real means deleting the process's current directory out from
	// under it mid-test, which is fragile, platform-dependent, and would
	// fight the working-directory tests elsewhere in this file, which
	// already can't run in parallel because they share that same process-
	// global state. The alternative, taking the directory as a parameter so
	// a fake can return an error, would add a seam with no caller besides
	// this one test. Neither trade is worth it for a branch that just logs
	// and falls back to the existing environment. See issue #52.
	dir, err := os.Getwd()
	if err != nil {
		log.Printf("could not determine working directory (%v), using the existing environment", err)
		return
	}

	for {
		if envPath := filepath.Join(dir, ".env"); fileExists(envPath) {
			if err := godotenv.Load(envPath); err != nil {
				log.Printf("found %s but could not load it: %v", envPath, err)
				return
			}
			log.Printf("loaded %s", envPath)
			return
		}

		// go.mod marks the module root: stop rather than escaping the project.
		if fileExists(filepath.Join(dir, "go.mod")) {
			break
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	log.Println("no .env file found, using the existing environment")
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}
