package ratelimit

import (
	"sync"
	"testing"
	"time"
)

// fakeClock lets tests move time forward deterministically instead of
// sleeping, so refill/expiry assertions (e.g. "a full minute refills the
// burst") run instantly and don't flake under load.
type fakeClock struct {
	mu  sync.Mutex
	now time.Time
}

func newFakeClock(start time.Time) *fakeClock {
	return &fakeClock{now: start}
}

func (c *fakeClock) Now() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.now
}

func (c *fakeClock) Advance(d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.now = c.now.Add(d)
}

// testLimiter builds a 5-requests-per-minute, burst-5 limiter — matching
// contactRateLimit/contactRateBurst in internal/routes, the actual budget
// wired onto the contact endpoint — driven by a fake clock.
func testLimiter(clock *fakeClock) *Limiter {
	return New(Config{
		Rate:       5,
		Burst:      5,
		Window:     time.Minute,
		StaleAfter: 10 * time.Minute,
		Now:        clock.Now,
	})
}

// TestAllow_UnderLimitPasses drives fewer requests than the burst through a
// single key and asserts every one is allowed - the ordinary case of a human
// submitting the contact form once must never be throttled.
func TestAllow_UnderLimitPasses(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock)

	for i := 1; i <= 5; i++ {
		allowed, retryAfter := l.Allow("1.2.3.4")
		if !allowed {
			t.Fatalf("Allow(\"1.2.3.4\") call #%d of 5 (burst=5): allowed = false, retryAfter = %v, want allowed = true", i, retryAfter)
		}
	}
}

// TestAllow_OverLimitRejectsWithRetryAfter exhausts the burst and asserts
// the very next request is rejected with a positive retryAfter, matching
// the contract's 429 + Retry-After requirement.
func TestAllow_OverLimitRejectsWithRetryAfter(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock)

	for i := 1; i <= 5; i++ {
		if allowed, retryAfter := l.Allow("1.2.3.4"); !allowed {
			t.Fatalf("Allow(\"1.2.3.4\") call #%d: allowed = false, retryAfter = %v, want allowed = true (still within burst of 5)", i, retryAfter)
		}
	}

	allowed, retryAfter := l.Allow("1.2.3.4")
	if allowed {
		t.Fatalf("Allow(\"1.2.3.4\") call #6 (burst=5 already spent): allowed = true, want false")
	}
	if retryAfter <= 0 {
		t.Errorf("Allow(\"1.2.3.4\") call #6: retryAfter = %v, want a positive duration to report via Retry-After", retryAfter)
	}
	// At 5/minute, one token refills every 12s. Rejecting immediately after
	// spending the full burst should ask for close to that, not e.g.
	// microseconds (which would suggest an off-by-something in the refill
	// math) or minutes (which would suggest the whole burst, not one token,
	// is being awaited).
	if want := 12 * time.Second; retryAfter < want-time.Second || retryAfter > want+time.Second {
		t.Errorf("Allow(\"1.2.3.4\") call #6: retryAfter = %v, want approximately %v (one token at 5/minute)", retryAfter, want)
	}
}

// TestAllow_RefillsAfterWindow proves a key that has been rejected becomes
// allowed again once its clock has advanced far enough to refill a token -
// driven entirely by the fake clock, no real waiting.
func TestAllow_RefillsAfterWindow(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock)

	for i := 1; i <= 5; i++ {
		if allowed, _ := l.Allow("1.2.3.4"); !allowed {
			t.Fatalf("Allow(\"1.2.3.4\") call #%d: allowed = false, want true (still within burst)", i)
		}
	}
	if allowed, _ := l.Allow("1.2.3.4"); allowed {
		t.Fatalf("Allow(\"1.2.3.4\") immediately after exhausting burst: allowed = true, want false")
	}

	// A full minute at 5/minute refills the entire burst; advance the fake
	// clock (not a real sleep) and confirm the key is unblocked again.
	clock.Advance(time.Minute)

	if allowed, retryAfter := l.Allow("1.2.3.4"); !allowed {
		t.Fatalf("Allow(\"1.2.3.4\") after advancing the clock by 1 minute: allowed = false, retryAfter = %v, want true (bucket should have fully refilled)", retryAfter)
	}
}

// TestAllow_PerKeyIndependent proves two different keys (IPs) get
// independent buckets: one IP exhausting its budget must never affect
// another visitor.
func TestAllow_PerKeyIndependent(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock)

	for i := 1; i <= 5; i++ {
		if allowed, _ := l.Allow("1.1.1.1"); !allowed {
			t.Fatalf("Allow(\"1.1.1.1\") call #%d: allowed = false, want true", i)
		}
	}
	if allowed, _ := l.Allow("1.1.1.1"); allowed {
		t.Fatalf("Allow(\"1.1.1.1\") call #6: allowed = true, want false (burst exhausted)")
	}

	// A different key must not be affected by 1.1.1.1's exhausted bucket.
	if allowed, retryAfter := l.Allow("2.2.2.2"); !allowed {
		t.Fatalf("Allow(\"2.2.2.2\") first call: allowed = false, retryAfter = %v, want true - a different IP's rate limit must be independent of 1.1.1.1's", retryAfter)
	}
}

// TestSweep_EvictsStaleEntries proves stale buckets are actually removed
// from the map, not just logically expired. This matters because the map is
// keyed on a client-supplied value (see clientKey) on a public, unauthenticated
// endpoint: without eviction, distinct keys accumulate without bound for as
// long as the process runs.
func TestSweep_EvictsStaleEntries(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock) // StaleAfter: 10 * time.Minute

	l.Allow("1.2.3.4")
	l.Allow("5.6.7.8")
	if got := l.Len(); got != 2 {
		t.Fatalf("Len() after two distinct keys: got %d, want 2", got)
	}

	// Not stale yet: well under StaleAfter.
	clock.Advance(5 * time.Minute)
	l.Sweep()
	if got := l.Len(); got != 2 {
		t.Fatalf("Len() after advancing 5m (StaleAfter=10m): got %d, want 2 (nothing should be evicted yet)", got)
	}

	// Touch 1.2.3.4 so it stays fresh; 5.6.7.8 is left untouched and should
	// age past StaleAfter. Advance by 9m (< StaleAfter since 1.2.3.4's last
	// touch) so 1.2.3.4 survives while 5.6.7.8, now 14m since its only
	// touch, does not.
	l.Allow("1.2.3.4")
	clock.Advance(9 * time.Minute)
	l.Sweep()

	if got := l.Len(); got != 1 {
		t.Fatalf("Len() after 5.6.7.8 goes stale: got %d, want 1 (5.6.7.8 should have been evicted, 1.2.3.4 should remain)", got)
	}

	// The surviving key must still behave like a normal (now-refilled)
	// bucket, not some half-evicted state.
	if allowed, retryAfter := l.Allow("1.2.3.4"); !allowed {
		t.Errorf("Allow(\"1.2.3.4\") after Sweep: allowed = false, retryAfter = %v, want true - surviving keys must still work normally after a sweep", retryAfter)
	}
}

// TestAllow_SweepEveryEvictsLazily proves the SweepEvery lazy-sweep path (the
// production path, exercised without an external ticker goroutine) evicts a
// stale key purely as a side effect of ordinary Allow calls.
func TestAllow_SweepEveryEvictsLazily(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := New(Config{
		Rate:       5,
		Burst:      5,
		Window:     time.Minute,
		StaleAfter: time.Minute,
		SweepEvery: 3,
		Now:        clock.Now,
	})

	l.Allow("stale-key")
	if got := l.Len(); got != 1 {
		t.Fatalf("Len() after first Allow: got %d, want 1", got)
	}

	clock.Advance(2 * time.Minute) // older than StaleAfter

	// Drive exactly SweepEvery calls from a different key so the lazy sweep
	// fires without ever touching stale-key again.
	for i := 0; i < 3; i++ {
		l.Allow("other-key")
	}

	if got := l.Len(); got != 1 {
		t.Fatalf("Len() after lazy sweep should have fired: got %d, want 1 (stale-key evicted, other-key remains)", got)
	}
}

// TestAllow_ConcurrentAccess hits the same limiter from many goroutines at
// once. It exists so `go test -race` (which CI runs on ubuntu-latest; this
// sandbox has no gcc/cgo to run -race itself) has something to actually
// catch if the bucket map's locking regresses.
func TestAllow_ConcurrentAccess(t *testing.T) {
	clock := newFakeClock(time.Now())
	l := testLimiter(clock)

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			key := "concurrent"
			if n%2 == 0 {
				key = "concurrent-b"
			}
			l.Allow(key)
		}(i)
	}
	wg.Wait()
}
