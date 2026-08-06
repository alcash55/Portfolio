package projects

import (
	"sync"
	"time"
)

// cache holds the single most recent successful fetch and single-flights
// refreshes, so a traffic spike against a cold or expired cache triggers
// exactly one upstream call instead of one per concurrent request.
type cache struct {
	ttl time.Duration
	now func() time.Time

	mu       sync.Mutex
	entry    *cacheEntry  // nil until the first successful fetch ever completes
	inflight *refreshCall // non-nil while a refresh is in progress
}

type cacheEntry struct {
	projects  []Project
	fetchedAt time.Time
}

// refreshCall is the shared result of one in-flight refresh. The goroutine
// that creates it (the "leader") runs refresh() and populates projects/err;
// every other concurrent caller (a "follower") just waits on done.
type refreshCall struct {
	done     chan struct{}
	projects []Project
	err      error
}

func newCache(ttl time.Duration, now func() time.Time) *cache {
	return &cache{ttl: ttl, now: now}
}

// get returns the cached projects if the TTL has not expired. On a cold or
// expired cache it calls refresh, single-flighting concurrent callers onto
// one call. If refresh fails and there is a previous successful fetch on
// record, that stale data is returned instead (stale=true) rather than
// propagating the error - old data beats no data. err is only non-nil when
// refresh failed and there is genuinely nothing cached yet.
func (c *cache) get(refresh func() ([]Project, error)) (projects []Project, stale bool, err error) {
	c.mu.Lock()
	if c.entry != nil && c.now().Sub(c.entry.fetchedAt) < c.ttl {
		projects = c.entry.projects
		c.mu.Unlock()
		return projects, false, nil
	}

	call := c.inflight
	leader := call == nil
	if leader {
		call = &refreshCall{done: make(chan struct{})}
		c.inflight = call
	}
	c.mu.Unlock()

	if leader {
		call.projects, call.err = refresh()

		c.mu.Lock()
		if call.err == nil {
			c.entry = &cacheEntry{projects: call.projects, fetchedAt: c.now()}
		}
		c.inflight = nil
		c.mu.Unlock()

		close(call.done)
	} else {
		<-call.done
	}

	if call.err == nil {
		return call.projects, false, nil
	}

	c.mu.Lock()
	entry := c.entry
	c.mu.Unlock()
	if entry != nil {
		return entry.projects, true, nil
	}
	return nil, false, call.err
}
