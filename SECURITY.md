# Security

This is a personal portfolio site. It holds no user accounts and stores no data — the contact
form forwards a message to a Discord channel and nothing is persisted.

## Reporting a vulnerability

Open a [private security advisory](https://github.com/alcash55/Portfolio/security/advisories/new),
or email alex.e.cash28@gmail.com. Please don't open a public issue for anything exploitable.

Expect a reply within a week. This is a side project, not a product with an on-call rotation.

## What's in scope

The parts worth looking at:

- **`POST /api/v1/contact`** — the only endpoint that accepts input. It validates and length-caps
  every field, rejects bodies over 64 KiB, rate limits per IP, and re-encodes the payload rather
  than forwarding it, so the Discord webhook only ever sees known-shaped values.
- **CORS** (`backend/internal/routes`) — `isLocalhost` is the entire local-dev origin boundary.
- **`GET /api/v1/projects`** — reads the GitHub API server-side and caches the result.

## Known and accepted

Being upfront about the things a scan will find, so nobody spends time on them:

- **The original Discord webhook URL is public.** It was inlined into a deployed client bundle by a
  `VITE_`-prefixed env var before the Go backend existed, so anyone who saved that JavaScript still
  has it. It points at a throwaway test channel, so it has not been rotated — the blast radius is
  junk messages in a channel nobody reads. The per-IP rate limiter is what stops it being used to
  flood that channel.
- **The rate limiter keys on the rightmost `X-Forwarded-For` entry.** That defeats a client forging
  the header, because the hosting proxy appends the real peer after anything the client sends. It
  does **not** defend against an attacker with many genuine source addresses — that needs a
  platform-level limit, and is out of scope for an in-memory limiter on a single free-tier instance.
- **No authentication anywhere.** There is nothing to authenticate; every endpoint is public by
  design.

## The rule that matters most in this repo

**Never put a secret in a `VITE_`-prefixed environment variable.** Vite inlines every one of them
into the client bundle at build time. That is exactly how the webhook above became public, and it
is the reason the Go backend exists at all. Anything that needs a credential belongs behind the
backend.
