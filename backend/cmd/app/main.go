package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"path/filepath"

	"github.com/alcash55/Portfolio/internal/routes"
	"github.com/alcash55/Portfolio/pkg/config"
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

func main() {
	loadEnv()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: routes.New(cfg).Handler(),
	}

	go func() {
		// service connections
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server with
	// a timeout of 5 seconds.
	quit := make(chan os.Signal, 1)
	// kill (no params) by default sends syscall.SIGTERM
	// kill -2 is syscall.SIGINT
	// kill -9 is syscall.SIGKILL but can't be caught, so don't need add it
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutdown Server ...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Println("Server Shutdown:", err)
	}
	log.Println("Server exiting")
}
