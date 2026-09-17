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
// The cached unit is a resumeAsset, not a bare []byte: the release tag
// travels with the PDF bytes it came from, so a cache hit - fresh or stale
// - always reports the release that actually produced what's being served,
// and a TTL-driven refetch swaps both fields atomically rather than risking
// a mismatched pair.
//
// Mirrors internal/handlers/projects's cache with resumeAsset in place of
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
	asset     resumeAsset
	fetchedAt time.Time
}

// refreshCall is the shared result of one in-flight refresh. The goroutine
// that creates it (the "leader") runs refresh() and populates asset/err;
// every other concurrent caller (a "follower") just waits on done.
type refreshCall struct {
	done  chan struct{}
	asset resumeAsset
	err   error
}

func newCache(ttl time.Duration, now func() time.Time) *cache {
	return &cache{ttl: ttl, now: now}
}

// get returns the cached asset if the TTL has not expired. On a cold or
// expired cache it calls refresh, single-flighting concurrent callers onto
// one call. If refresh fails and there is a previous successful fetch on
// record, that stale data is returned instead (stale=true) rather than
// propagating the error - old data beats no data, and also covers a GitHub
// outage. err is only non-nil when refresh failed and there is genuinely
// nothing cached yet for this variant.
func (c *cache) get(refresh func() (resumeAsset, error)) (asset resumeAsset, stale bool, err error) {
	c.mu.Lock()
	if c.entry != nil && c.now().Sub(c.entry.fetchedAt) < c.ttl {
		asset = c.entry.asset
		c.mu.Unlock()
		return asset, false, nil
	}

	call := c.inflight
	leader := call == nil
	if leader {
		call = &refreshCall{done: make(chan struct{})}
		c.inflight = call
	}
	c.mu.Unlock()

	if leader {
		call.asset, call.err = refresh()

		c.mu.Lock()
		if call.err == nil {
			c.entry = &cacheEntry{asset: call.asset, fetchedAt: c.now()}
		}
		c.inflight = nil
		c.mu.Unlock()

		close(call.done)
	} else {
		<-call.done
	}

	if call.err == nil {
		return call.asset, false, nil
	}

	c.mu.Lock()
	entry := c.entry
	c.mu.Unlock()
	if entry != nil {
		return entry.asset, true, nil
	}
	return resumeAsset{}, false, call.err
}
