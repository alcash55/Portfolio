package ttlcache

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type clock struct {
	mu  sync.Mutex
	now time.Time
}

func (c *clock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *clock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

func newClock() *clock { return &clock{now: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)} }

func TestGet_ServesFreshEntryWithoutRefreshing(t *testing.T) {
	clk := newClock()
	c := New[string](time.Hour, clk.Now)
	calls := 0
	refresh := func() (string, error) { calls++; return "v1", nil }

	if _, _, err := c.Get(refresh); err != nil {
		t.Fatalf("first Get: %v", err)
	}
	clk.Advance(time.Hour - time.Second)
	got, stale, err := c.Get(refresh)
	if err != nil || stale || got != "v1" {
		t.Fatalf("Get inside TTL = (%q, stale=%v, %v), want (\"v1\", false, nil)", got, stale, err)
	}
	if calls != 1 {
		t.Errorf("refresh calls inside TTL = %d, want 1", calls)
	}
}

func TestGet_RefreshesAfterTTL(t *testing.T) {
	clk := newClock()
	c := New[string](time.Hour, clk.Now)
	n := 0
	refresh := func() (string, error) { n++; return []string{"v1", "v2"}[n-1], nil }

	c.Get(refresh)
	clk.Advance(time.Hour)
	got, stale, err := c.Get(refresh)
	if err != nil || stale || got != "v2" {
		t.Errorf("Get at TTL = (%q, stale=%v, %v), want (\"v2\", false, nil)", got, stale, err)
	}
}

func TestGet_FailedRefreshServesStaleEntry(t *testing.T) {
	clk := newClock()
	c := New[string](time.Hour, clk.Now)
	c.Get(func() (string, error) { return "v1", nil })
	clk.Advance(2 * time.Hour)

	got, stale, err := c.Get(func() (string, error) { return "", errors.New("upstream down") })
	if err != nil {
		t.Fatalf("Get with a stale entry on record returned error %v, want nil", err)
	}
	if !stale || got != "v1" {
		t.Errorf("Get = (%q, stale=%v), want (\"v1\", true)", got, stale)
	}
}

func TestGet_ColdFailureReturnsError(t *testing.T) {
	c := New[[]string](time.Hour, newClock().Now)
	boom := errors.New("upstream down")

	got, stale, err := c.Get(func() ([]string, error) { return nil, boom })
	if !errors.Is(err, boom) {
		t.Errorf("Get error = %v, want %v", err, boom)
	}
	if stale || got != nil {
		t.Errorf("Get = (%v, stale=%v), want (nil, false)", got, stale)
	}
}

func TestGet_ConcurrentCallersShareOneRefresh(t *testing.T) {
	c := New[int](time.Hour, newClock().Now)
	var calls int32
	release := make(chan struct{})
	refresh := func() (int, error) {
		atomic.AddInt32(&calls, 1)
		<-release
		return 7, nil
	}

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if got, _, err := c.Get(refresh); err != nil || got != 7 {
				t.Errorf("Get = (%d, %v), want (7, nil)", got, err)
			}
		}()
	}
	close(release)
	wg.Wait()

	if got := atomic.LoadInt32(&calls); got != 1 {
		t.Errorf("refresh calls for 20 concurrent Gets = %d, want 1", got)
	}
}

func TestState_RecordsFailureEvenWhenStaleMasksIt(t *testing.T) {
	clk := newClock()
	c := New[string](time.Hour, clk.Now)

	if s := c.State(); s.Cached || s.LastFailure != nil || !s.LastFailureAt.IsZero() {
		t.Fatalf("State before any Get = %+v, want zero", s)
	}

	c.Get(func() (string, error) { return "v1", nil })
	fetchedAt := clk.Now()
	clk.Advance(2 * time.Hour)
	boom := errors.New("upstream down")
	c.Get(func() (string, error) { return "", boom })

	s := c.State()
	if !s.Cached || s.Value != "v1" || !s.FetchedAt.Equal(fetchedAt) {
		t.Errorf("State = %+v, want cached \"v1\" fetched at %v", s, fetchedAt)
	}
	if !errors.Is(s.LastFailure, boom) || !s.LastFailureAt.Equal(clk.Now()) {
		t.Errorf("State failure = (%v at %v), want (%v at %v)", s.LastFailure, s.LastFailureAt, boom, clk.Now())
	}

	// A later success does not erase the failure: the resume status endpoint
	// reports the last failure ever seen, not only the current one.
	clk.Advance(2 * time.Hour)
	c.Get(func() (string, error) { return "v2", nil })
	if s := c.State(); s.Value != "v2" || !errors.Is(s.LastFailure, boom) {
		t.Errorf("State after recovery = %+v, want value \"v2\" and the earlier failure kept", s)
	}
}
