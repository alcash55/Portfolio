package contributions

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/alcash55/Portfolio/pkg/config"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// calendarBody is a trimmed GraphQL answer in GitHub's shape: two weeks, the
// second cut short because the year ends mid-week.
const calendarBody = `{"data":{"user":{"contributionsCollection":{"contributionCalendar":{"weeks":[
	{"firstDay":"2026-11-01","contributionDays":[{"contributionCount":0},{"contributionCount":3},{"contributionCount":0},{"contributionCount":12},{"contributionCount":1},{"contributionCount":0},{"contributionCount":40}]},
	{"firstDay":"2026-11-08","contributionDays":[{"contributionCount":5},{"contributionCount":0}]}
]}}}}}`

type fakeGitHub struct {
	server *httptest.Server
	calls  atomic.Int32
	auth   atomic.Value
	body   atomic.Value
}

func newFakeGitHub(t *testing.T, status int, answer string) *fakeGitHub {
	t.Helper()
	f := &fakeGitHub{}
	f.server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.calls.Add(1)
		f.auth.Store(r.Header.Get("Authorization"))
		raw, _ := io.ReadAll(r.Body)
		f.body.Store(string(raw))
		if r.Method != http.MethodPost || r.URL.Path != "/graphql" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.WriteHeader(status)
		_, _ = io.WriteString(w, answer)
	}))
	t.Cleanup(f.server.Close)
	return f
}

func get(t *testing.T, h *Handler) *httptest.ResponseRecorder {
	t.Helper()
	router := gin.New()
	router.GET("/api/v1/contributions", h.GetContributions)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/contributions", nil))
	return rec
}

func TestReturnsTheCalendarAsWeeks(t *testing.T) {
	gh := newFakeGitHub(t, http.StatusOK, calendarBody)
	h := New(config.Config{GHToken: "test-token"}, WithBaseURL(gh.server.URL))

	rec := get(t, h)

	if rec.Code != http.StatusOK {
		t.Fatalf("status: want 200, got %d, body %s", rec.Code, rec.Body)
	}
	want := `{"weeks":[{"start":"2026-11-01","days":[0,3,0,12,1,0,40]},{"start":"2026-11-08","days":[5,0]}],"stale":false}`
	if got := strings.TrimSpace(rec.Body.String()); got != want {
		t.Fatalf("body:\nwant %s\ngot  %s", want, got)
	}
	if got := gh.auth.Load(); got != "Bearer test-token" {
		t.Fatalf("Authorization: want %q, got %q", "Bearer test-token", got)
	}
	var sent struct {
		Variables map[string]string `json:"variables"`
	}
	if err := json.Unmarshal([]byte(gh.body.Load().(string)), &sent); err != nil {
		t.Fatalf("request body is not JSON: %v", err)
	}
	if sent.Variables["login"] != "alcash55" {
		t.Fatalf("login variable: want %q, got %q", "alcash55", sent.Variables["login"])
	}
}

func TestWithoutATokenItFailsWithoutCallingGitHub(t *testing.T) {
	// GitHub's GraphQL API rejects every unauthenticated request, so there is
	// no anonymous fallback like the REST handlers have.
	gh := newFakeGitHub(t, http.StatusOK, calendarBody)
	h := New(config.Config{}, WithBaseURL(gh.server.URL))

	rec := get(t, h)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status: want 502, got %d", rec.Code)
	}
	if n := gh.calls.Load(); n != 0 {
		t.Fatalf("GitHub calls: want 0, got %d", n)
	}
}

func TestGraphQLErrorsAreAFailure(t *testing.T) {
	// GraphQL reports a bad query or an unknown user with a 200 and an errors list.
	gh := newFakeGitHub(t, http.StatusOK, `{"data":{"user":null},"errors":[{"message":"Could not resolve to a User"}]}`)
	h := New(config.Config{GHToken: "test-token"}, WithBaseURL(gh.server.URL))

	rec := get(t, h)

	if rec.Code != http.StatusBadGateway {
		t.Fatalf("status: want 502, got %d, body %s", rec.Code, rec.Body)
	}
	if strings.Contains(rec.Body.String(), "resolve") {
		t.Fatalf("GitHub's error text leaked to the client: %s", rec.Body)
	}
}

func TestAnHourOfRequestsCostsOneGitHubCall(t *testing.T) {
	gh := newFakeGitHub(t, http.StatusOK, calendarBody)
	h := New(config.Config{GHToken: "test-token"}, WithBaseURL(gh.server.URL))

	for range 5 {
		if rec := get(t, h); rec.Code != http.StatusOK {
			t.Fatalf("status: want 200, got %d", rec.Code)
		}
	}

	if n := gh.calls.Load(); n != 1 {
		t.Fatalf("GitHub calls for 5 requests: want 1, got %d", n)
	}
}
