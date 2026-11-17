// Package contributions implements GET /api/v1/contributions: the GitHub
// contribution calendar for alcash55, the squares on the profile page,
// fetched from GitHub's GraphQL API and cached for an hour.
package contributions

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/alcash55/Portfolio/internal/ttlcache"
	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

const login = "alcash55"

const (
	defaultBaseURL   = "https://api.github.com"
	cacheTTL         = time.Hour
	githubTimeout    = 10 * time.Second
	maxBodyBytes     = 1 << 20
	notLoadedMessage = "could not load contributions"
)

// The calendar covers the last year, ending today, in Sunday-first weeks.
const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { firstDay contributionDays { contributionCount } }
      }
    }
  }
}`

// Week is one column of the calendar. The json tags are the wire contract
// the frontend reads. days starts on Sunday. The first and last weeks can be
// short, because the year starts and ends mid-week.
type Week struct {
	Start string `json:"start"`
	Days  []int  `json:"days"`
}

type response struct {
	Weeks []Week `json:"weeks"`
	Stale bool   `json:"stale"`
}

type graphQLAnswer struct {
	Data struct {
		User *struct {
			ContributionsCollection struct {
				ContributionCalendar struct {
					Weeks []struct {
						FirstDay         string `json:"firstDay"`
						ContributionDays []struct {
							ContributionCount int `json:"contributionCount"`
						} `json:"contributionDays"`
					} `json:"weeks"`
				} `json:"contributionCalendar"`
			} `json:"contributionsCollection"`
		} `json:"user"`
	} `json:"data"`
	Errors []json.RawMessage `json:"errors"`
}

// Handler carries what GET /api/v1/contributions needs.
type Handler struct {
	cfg     config.Config
	client  *http.Client
	baseURL string
	cache   *ttlcache.Cache[[]Week]
}

// Option configures a Handler. Tests use them to point at a fake GitHub.
type Option func(*Handler)

// WithBaseURL overrides the GitHub API base URL.
func WithBaseURL(url string) Option {
	return func(h *Handler) { h.baseURL = url }
}

// New builds a contributions handler bound to cfg.
func New(cfg config.Config, opts ...Option) *Handler {
	h := &Handler{
		cfg:     cfg,
		client:  &http.Client{Timeout: githubTimeout},
		baseURL: defaultBaseURL,
		cache:   ttlcache.New[[]Week](cacheTTL, time.Now),
	}
	for _, opt := range opts {
		opt(h)
	}
	return h
}

// GetContributions is the gin.HandlerFunc for GET /api/v1/contributions.
func (h *Handler) GetContributions(c *gin.Context) {
	// Not c.Request.Context(): the refresh is shared by every request waiting
	// on the cache, so one caller hanging up must not cancel it.
	weeks, stale, err := h.cache.Get(func() ([]Week, error) {
		return h.fetch(context.Background())
	})
	if err != nil {
		log.Printf("contributions: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": notLoadedMessage})
		return
	}
	c.JSON(http.StatusOK, response{Weeks: weeks, Stale: stale})
}

func (h *Handler) fetch(ctx context.Context) ([]Week, error) {
	// GitHub's GraphQL API rejects every unauthenticated request.
	if h.cfg.GHToken == "" {
		return nil, errors.New("GH_TOKEN is not set")
	}

	payload, err := json.Marshal(map[string]any{
		"query":     query,
		"variables": map[string]string{"login": login},
	})
	if err != nil {
		return nil, fmt.Errorf("building query: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.baseURL+"/graphql", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("building request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "alcash55-portfolio-backend")
	req.Header.Set("Authorization", "Bearer "+h.cfg.GHToken)

	resp, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	var answer graphQLAnswer
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxBodyBytes)).Decode(&answer); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}
	// GraphQL reports failures with a 200 and an errors list.
	if len(answer.Errors) > 0 || answer.Data.User == nil {
		return nil, fmt.Errorf("GitHub returned %d GraphQL error(s)", len(answer.Errors))
	}

	raw := answer.Data.User.ContributionsCollection.ContributionCalendar.Weeks
	weeks := make([]Week, 0, len(raw))
	for _, w := range raw {
		days := make([]int, 0, len(w.ContributionDays))
		for _, d := range w.ContributionDays {
			days = append(days, d.ContributionCount)
		}
		weeks = append(weeks, Week{Start: w.FirstDay, Days: days})
	}
	return weeks, nil
}
