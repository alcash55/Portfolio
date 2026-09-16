package resume

import (
	"sync"
	"time"
)

// cache holds the single most recent successful fetch for one resume
// variant and single-flights refreshes, so a traffic spike against a cold or
// expired cache triggers exactly one upstream call instead of one per
// concurrent request. Handler keeps one instance per variant (see
// Handler.caches).
//
// Mirrors internal/handlers/projects's cache with []byte in place of
// []Project - see that package for the fuller single-flight and
// stale-on-failure reasoning this shares.
type cache struct {
	ttl time.Duration
	now func() time.Time

	mu       sync.Mutex
	entry    *cacheEntry  // nil until this variant's first successful fetch ever completes
	inflight *refreshCall // non-nil while a refresh is in progress
}

type cacheEntry struct {
	pdf       []byte
	fetchedAt time.Time
}

// refreshCall is the shared result of one in-flight refresh. The goroutine
// that creates it (the "leader") runs refresh() and populates pdf/err; every
// other concurrent caller (a "follower") just waits on done.
type refreshCall struct {
	done chan struct{}
	pdf  []byte
	err  error
}

func newCache(ttl time.Duration, now func() time.Time) *cache {
	return &cache{ttl: ttl, now: now}
}

// get returns the cached PDF if the TTL has not expired. On a cold or
// expired cache it calls refresh, single-flighting concurrent callers onto
// one call. If refresh fails and there is a previous successful fetch on
// record, that stale data is returned instead (stale=true) rather than
// propagating the error - old data beats no data, and also covers a GitHub
// outage. err is only non-nil when refresh failed and there is genuinely
// nothing cached yet for this variant.
func (c *cache) get(refresh func() ([]byte, error)) (pdf []byte, stale bool, err error) {
	c.mu.Lock()
	if c.entry != nil && c.now().Sub(c.entry.fetchedAt) < c.ttl {
		pdf = c.entry.pdf
		c.mu.Unlock()
		return pdf, false, nil
	}

	call := c.inflight
	leader := call == nil
	if leader {
		call = &refreshCall{done: make(chan struct{})}
		c.inflight = call
	}
	c.mu.Unlock()

	if leader {
		call.pdf, call.err = refresh()

		c.mu.Lock()
		if call.err == nil {
			c.entry = &cacheEntry{pdf: call.pdf, fetchedAt: c.now()}
		}
		c.inflight = nil
		c.mu.Unlock()

		close(call.done)
	} else {
		<-call.done
	}

	if call.err == nil {
		return call.pdf, false, nil
	}

	c.mu.Lock()
	entry := c.entry
	c.mu.Unlock()
	if entry != nil {
		return entry.pdf, true, nil
	}
	return nil, false, call.err
}
