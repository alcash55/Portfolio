// Package ttlcache holds the single most recent successful fetch of one
// value and single-flights refreshes. The projects, resume and ci-actions
// handlers each wrap their upstream GitHub call in one.
package ttlcache

import (
	"sync"
	"time"
)

// Cache holds the single most recent successful fetch and single-flights
// refreshes, so a traffic spike against a cold or expired cache triggers
// exactly one upstream call instead of one per concurrent request.
type Cache[T any] struct {
	ttl time.Duration
	now func() time.Time

	mu       sync.Mutex
	entry    *entry[T]       // nil until the first successful fetch ever completes
	inflight *refreshCall[T] // non-nil while a refresh is in progress

	// lastFailure records the most recent refresh failure regardless of
	// whether a stale entry masked it from a caller of Get - a status
	// diagnostic needs to see it even when every visitor-facing request is
	// still getting a 200 from stale data. A later success does not clear it.
	lastFailure   error
	lastFailureAt time.Time
}

type entry[T any] struct {
	value     T
	fetchedAt time.Time
}

// refreshCall is the shared result of one in-flight refresh. The goroutine
// that creates it (the "leader") runs refresh() and populates value/err;
// every other concurrent caller (a "follower") just waits on done.
type refreshCall[T any] struct {
	done  chan struct{}
	value T
	err   error
}

// New builds a Cache whose entries expire ttl after they were fetched. now
// is the clock; tests pass a fake one to cross the TTL without sleeping.
func New[T any](ttl time.Duration, now func() time.Time) *Cache[T] {
	return &Cache[T]{ttl: ttl, now: now}
}

// SetNow replaces the clock. Call it before the cache serves traffic.
func (c *Cache[T]) SetNow(now func() time.Time) {
	c.now = now
}

// Get returns the cached value if the TTL has not expired. On a cold or
// expired cache it calls refresh, single-flighting concurrent callers onto
// one call. If refresh fails and there is a previous successful fetch on
// record, that stale data is returned instead (stale=true) rather than
// propagating the error - old data beats no data, and also covers an
// upstream outage. err is only non-nil when refresh failed and there is
// genuinely nothing cached yet.
func (c *Cache[T]) Get(refresh func() (T, error)) (value T, stale bool, err error) {
	c.mu.Lock()
	if c.entry != nil && c.now().Sub(c.entry.fetchedAt) < c.ttl {
		value = c.entry.value
		c.mu.Unlock()
		return value, false, nil
	}

	call := c.inflight
	leader := call == nil
	if leader {
		call = &refreshCall[T]{done: make(chan struct{})}
		c.inflight = call
	}
	c.mu.Unlock()

	if leader {
		call.value, call.err = refresh()

		c.mu.Lock()
		if call.err == nil {
			c.entry = &entry[T]{value: call.value, fetchedAt: c.now()}
		} else {
			// Recorded here rather than only where Get returns an error to
			// its caller, since a stale entry below makes that return path
			// skip entirely.
			c.lastFailure = call.err
			c.lastFailureAt = c.now()
		}
		c.inflight = nil
		c.mu.Unlock()

		close(call.done)
	} else {
		<-call.done
	}

	if call.err == nil {
		return call.value, false, nil
	}

	c.mu.Lock()
	e := c.entry
	c.mu.Unlock()
	if e != nil {
		return e.value, true, nil
	}
	var zero T
	return zero, false, call.err
}

// State is a point-in-time read of the cache, for status diagnostics.
type State[T any] struct {
	Cached        bool
	Value         T         // zero unless Cached
	FetchedAt     time.Time // zero unless Cached
	LastFailure   error     // nil if a refresh has never failed
	LastFailureAt time.Time // zero if a refresh has never failed
}

// State returns the current cache state without triggering a refresh.
func (c *Cache[T]) State() State[T] {
	c.mu.Lock()
	defer c.mu.Unlock()

	s := State[T]{LastFailure: c.lastFailure, LastFailureAt: c.lastFailureAt}
	if c.entry != nil {
		s.Cached = true
		s.Value = c.entry.value
		s.FetchedAt = c.entry.fetchedAt
	}
	return s
}
