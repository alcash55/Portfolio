// Package ratelimit implements a per-key in-memory token bucket rate
// limiter.
//
// It exists specifically to protect POST /api/v1/contact: that endpoint
// forwards to a Discord webhook URL that is permanently public (it was
// inlined into a deployed bundle and is not being rotated), so this limiter
// is the only thing standing between that known URL and a flooded channel.
package ratelimit

import (
	"sync"
	"time"
)

// Config configures a Limiter.
type Config struct {
	// Rate is how many requests a key may sustain per Window once its burst
	// is exhausted.
	Rate int
	// Burst is the bucket capacity: the number of requests a key may make
	// instantaneously before the per-Window Rate applies.
	Burst int
	// Window is the period Rate is expressed over (e.g. time.Minute for
	// "5 requests/minute").
	Window time.Duration
	// StaleAfter is how long a bucket may go untouched before it becomes
	// eligible for eviction. A bucket at rest refills to full within one
	// Window's worth of Rate, so evicting it well after that and recreating
	// it fresh on the key's next request is invisible to callers - only
	// memory is reclaimed.
	StaleAfter time.Duration
	// SweepEvery makes Allow perform a lazy eviction sweep every N calls, so
	// a long-running process keeps the bucket map bounded without needing an
	// external ticker goroutine. 0 disables automatic sweeping (tests can
	// still call Sweep directly).
	SweepEvery int
	// Now returns the current time. Defaults to time.Now. Tests inject a
	// fake clock so refill and expiry are deterministic without sleeping.
	Now func() time.Time
}

type bucket struct {
	tokens     float64
	lastRefill time.Time
	lastSeen   time.Time
}

// Limiter is a per-key token bucket rate limiter, safe for concurrent use.
type Limiter struct {
	mu         sync.Mutex
	buckets    map[string]*bucket
	ratePerSec float64
	burst      float64
	staleAfter time.Duration
	sweepEvery int
	calls      int
	now        func() time.Time
}

// New builds a Limiter from cfg.
func New(cfg Config) *Limiter {
	now := cfg.Now
	if now == nil {
		now = time.Now
	}
	return &Limiter{
		buckets:    make(map[string]*bucket),
		ratePerSec: float64(cfg.Rate) / cfg.Window.Seconds(),
		burst:      float64(cfg.Burst),
		staleAfter: cfg.StaleAfter,
		sweepEvery: cfg.SweepEvery,
		now:        now,
	}
}

// Allow reports whether a request identified by key is allowed right now.
// When it is not, retryAfter is the minimum duration the caller should wait
// before its next token becomes available.
func (l *Limiter) Allow(key string) (allowed bool, retryAfter time.Duration) {
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: l.burst, lastRefill: now}
		l.buckets[key] = b
	} else if elapsed := now.Sub(b.lastRefill).Seconds(); elapsed > 0 {
		b.tokens = min(l.burst, b.tokens+elapsed*l.ratePerSec)
		b.lastRefill = now
	}
	b.lastSeen = now

	if l.sweepEvery > 0 {
		l.calls++
		if l.calls%l.sweepEvery == 0 {
			l.sweepLocked(now)
		}
	}

	if b.tokens < 1 {
		deficit := 1 - b.tokens
		wait := time.Duration(deficit / l.ratePerSec * float64(time.Second))
		return false, wait
	}

	b.tokens--
	return true, 0
}

// Sweep evicts buckets that have gone untouched for at least StaleAfter, so
// a public endpoint's per-key map does not grow without bound. Production
// leans on the lazy sweep built into Allow (see Config.SweepEvery); tests
// call Sweep directly against a fake clock for a deterministic assertion.
func (l *Limiter) Sweep() {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.sweepLocked(l.now())
}

// sweepLocked assumes l.mu is already held.
func (l *Limiter) sweepLocked(now time.Time) {
	for key, b := range l.buckets {
		if now.Sub(b.lastSeen) >= l.staleAfter {
			delete(l.buckets, key)
		}
	}
}

// Len reports the number of keys currently tracked. It exists so tests can
// assert stale entries are actually removed, not just that Sweep runs
// without error.
func (l *Limiter) Len() int {
	l.mu.Lock()
	defer l.mu.Unlock()
	return len(l.buckets)
}
