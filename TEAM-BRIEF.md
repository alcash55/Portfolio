# TEAM-BRIEF — Sprint 5: Dynamic projects from the GitHub API

Scratch file. Deleted at the end of the sprint. **Do not cite this file in a code comment** — it
will not exist. If a comment needs to explain *why*, write the reason in the comment itself.

## Goal

The Projects section renders from a hardcoded `projectsList` array. Pull the live data from the
GitHub API through the Go backend so the site stays current as repos change, without a manual edit.

**Server-side by decision.** A `VITE_`-prefixed GitHub token would be inlined into the client
bundle at build time — exactly the mistake that made the Discord webhook public and created this
backend in the first place. The token must never reach the browser.

## Reality check — read before designing anything

Two things were verified against the live API while scoping this. Both differ from the original
plan, and both are settled decisions:

1. **The `GH_TOKEN` currently in `backend/.env` returns `401`.** It is expired or revoked. Alex is
   minting a replacement soon. **Build as though a valid token will be present, but do not block
   on it** — the endpoint must degrade cleanly (see B3) so the site keeps working until it lands.
2. **None of the 17 public repos have topics**, so the originally-planned "filter by topic
   `portfolio`" returns an empty list. **Curation is an allow-list of repo names in backend
   config instead.** Alex's call.

Also relevant: two of the four curated projects do not link to GitHub at all (`littletown.gay`,
a VS Code Marketplace listing). The hand-written descriptions, screenshots, and links are an
**override layer** the API does not get to clobber.

## Ground rules

- **52 frontend tests and the full Go suite must still pass**, plus `bun run lint`
  (`--max-warnings 0`), `bunx tsc --noEmit`, `bun run build`, `go vet ./...`, `gofmt -l .`.
- **No `any`.** No new `go.mod` dependencies — `net/http` is enough for a repo list; the original
  plan said reach for `go-github` only if response shaping got fiddly, and it does not.
- **Never log or return the token.** Not in an error message, not in a debug line.
- `go test -race` cannot run here (no `gcc`). Use plain `go test`; CI runs `-race`.
- **Do not call the live GitHub API from tests.** Use `httptest` with an injected base URL.
- Browser verification required for frontend. The Playwright MCP tools are in your allowlist but
  frequently are **not** actually available — check, and if absent drive `playwright-core` against
  `bun run dev`. Dev servers here get killed after ~2–4 min and Vite's watcher is unreliable on
  `/mnt/c` — restart fresh before each pass.

## Ownership

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **backend** | `backend/**` | `frontend/**`, `.github/**`, `render.yaml` |
| **frontend** | `frontend/src/components/Pages/Projects/**` | everything else |
| **devops** | `render.yaml`, `.github/**` | `backend/**`, `frontend/**` (read only) |

---

## Interface contract — fixed, do not invent alternatives

### `GET /api/v1/projects`

Success → `200`:

```json
{
  "projects": [
    {
      "name": "Little-Town",
      "description": "text from GitHub, may be empty string",
      "url": "https://github.com/alcash55/Little-Town",
      "homepage": "https://littletown.gay/",
      "language": "TypeScript",
      "stars": 0,
      "topics": [],
      "updatedAt": "2026-08-01T12:00:00Z"
    }
  ],
  "stale": false
}
```

- Field names are exactly as above, camelCase. `topics` is `[]` not `null` when empty.
  `homepage` and `language` are `""` when GitHub returns null.
- `stale: true` means the cache TTL expired but the upstream refresh failed, so this is the last
  known-good data. Serve it anyway — old data beats no data. The frontend may surface this.
- Order matches the configured allow-list order, **not** GitHub's response order. The allow-list
  is a curation decision and its order is deliberate.

Failure → `502` with `{"error":"could not load projects"}` when there is no data at all to serve
(cold cache **and** upstream failed — which is exactly today's state with the dead token). The
frontend falls back to its static list on any non-2xx.

**Do not leak upstream detail into the error body.** Same rule as the contact handler: log the
real reason server-side, return a stable safe message.

---

## BACKEND tasks

### B1 — The allow-list in config

Add `ProjectRepos []string` to `config.Config`, read from a `PROJECT_REPOS` env var
(comma-separated). Default when unset, in this order — it is the current curated order:

```
Little-Town, ac-composite-actions, Royalty-VS-Code-Theme, Portfolio
```

Follow the existing `ALLOWED_ORIGINS` parsing pattern **including its hard-won lesson**: unset →
defaults, but **set-but-parses-to-empty is an error**, not a silent fallback. `config.go` already
does exactly this for origins; mirror it and reuse the helper rather than duplicating the logic.

Owner is `alcash55` — a constant is fine, don't over-parameterize.

### B2 — The handler

`GET /api/v1/projects`, in a new `internal/handlers/projects` package following the shape of
`internal/handlers/contact` (struct holding deps, method as the `gin.HandlerFunc`).

- Fetch each allow-listed repo from `https://api.github.com/repos/{owner}/{name}`.
- **The GitHub base URL must be injectable** so tests point at an `httptest` server. Do not
  hardcode `api.github.com` in a way tests can't override.
- Send `Authorization: Bearer <GH_TOKEN>` **only when the token is non-empty**. An empty token
  header is worse than none — GitHub rejects it outright, whereas no header is a valid
  unauthenticated request.
- Set `Accept: application/vnd.github+json` and a `User-Agent` (GitHub requires one and will
  reject requests without it).
- Give the client a timeout. A hung upstream must not hang the endpoint.
- Fetch repos **concurrently** — four sequential round-trips on a cold cache is a slow first load.
  Guard shared state; CI runs `-race`.

### B3 — Cache, and degrade cleanly

In-memory, **1 hour TTL**. This is what keeps the endpoint within GitHub's rate limit
(60/hr unauthenticated, 5000/hr authenticated) regardless of site traffic.

Three behaviors that matter more than the happy path:

- **Single-flight.** Concurrent requests against a cold or expired cache must trigger **one**
  upstream fetch, not one per request. A traffic spike stampeding GitHub is exactly what the
  cache exists to prevent.
- **Serve stale on failure.** If the TTL expired and the refresh fails, return the last good data
  with `stale: true` rather than a 502. Only 502 when there is genuinely nothing cached.
- **A 401 from GitHub must not crash or hang anything.** This is today's actual state — the token
  is dead. The endpoint must log the failure clearly (without the token) and return 502 so the
  frontend falls back. When Alex swaps in a valid token this path stops firing with no code change.

**Injectable clock**, like `internal/ratelimit` — TTL expiry tests must not sleep.

### B4 — Wire it up and keep `GH_TOKEN` optional

Register the route in `internal/routes`. **`GH_TOKEN` must remain optional in `config.Load()`.**
It is not set in `render.yaml` today, so making it required would stop the live API from booting —
that would be a self-inflicted outage. Delete the now-stale "nothing reads it yet" comment on
`GHToken`, since this endpoint is what finally reads it.

Decide whether the route sits behind the existing rate limiter and **say why in your report**. The
cache means one upstream call per hour regardless, so the limiter buys little here — but argue it,
don't skip it. `/healthz` and `/` are deliberately unlimited; follow that reasoning.

### B5 — Tests

Table-driven, `httptest` for the fake GitHub, no live network, no sleeps.

- Happy path: allow-listed repos are fetched and mapped to the contract's exact shape, **in
  allow-list order** (make the fake return them in a different order to prove ordering is ours).
- `null` `homepage`/`language`/`topics` from GitHub become `""`/`""`/`[]`, never `null`.
- Cache hit: a second request within the TTL makes **zero** additional upstream calls (count them
  in the fake).
- Cache expiry: advance the injected clock past the TTL and prove a refetch happens.
- Single-flight: concurrent cold-cache requests produce exactly one upstream fetch.
- **Stale-on-failure:** prime the cache, expire it, make upstream fail, assert `200` with
  `stale: true` and the old data.
- **Cold cache + upstream 401** (today's real state): assert `502` and the stable error body, and
  assert the token does not appear in the response.
- Upstream 404 for one repo in the list: decide and pin the behavior — skip that repo or fail the
  whole response. Say which you chose and why.
- The `Authorization` header is present when a token is configured and **absent entirely** when it
  is empty.

---

## FRONTEND tasks

You own `frontend/src/components/Pages/Projects/**` only.

### F1 — Fetch from the API, keep the static list as the override layer

The existing `projectsList` in `Projects.tsx` holds hand-written descriptions, screenshots, and
links — including two that don't point at GitHub. **That data stays and wins.**

Restructure so the static entries are keyed by repo name and the API supplies only live metadata
(stars, language, `updatedAt`, and the GitHub description where no hand-written one exists). A
project with no matching API entry still renders from its static data.

Use `VITE_API_URL` the same way `useConnectForm` does. Extract the fetching into a hook beside the
component, following `useConnectForm`'s shape — including its lesson: **branch on status code,
never on the response's error string.**

### F2 — Loading skeletons

MUI `Skeleton` matching the card layout, so the section doesn't jump when data lands. Remember the
Render cold start is ~50 s on a sleeping backend — the skeleton may be visible for a while, so it
must look deliberate rather than broken.

### F3 — Fallback must be invisible to the user

On any non-2xx, network error, or timeout, render the static list exactly as today. **A visitor
must not be able to tell the API failed** — no error banner, no empty section, no console noise
beyond a single `console.error`. This is the state the site is in *right now* with the dead token,
so it is the path most likely to be seen in production. Treat it as the primary path, not the edge
case.

Give the fetch an `AbortController` timeout so a hung backend can't leave skeletons up forever.

### F4 — Tests and browser verification

Vitest, stubbing `fetch` — never hit the network. Cover: successful render from API data; static
data winning over API data for the fields it owns; fallback to the static list on 502, on a
network throw, and on timeout; skeletons showing while in flight.

In a browser, exercise all four states: loading, success, 502 fallback, and slow/hung. Confirm the
fallback is visually identical to today's section. Report which states you drove and how.

---

## DEVOPS task

### D1 — `GH_TOKEN` in `render.yaml`

The backend is about to read `GH_TOKEN`, and it is **not currently in `render.yaml`**, so the
deployed API has no way to get one.

Add it to the `portfolio-api` service's `envVars` with `sync: false`, matching how `WEBHOOK_URL`
is handled — the value stays in Render's dashboard and never lands in the repo. Do not invent a
value or add a placeholder that could be mistaken for one.

Note in your report that **the service will keep booting without it** (the backend treats it as
optional by design) and that the projects endpoint will serve its fallback until a real token is
set in the dashboard — so this change is safe to deploy before Alex mints the token.

Validate the YAML parses. Confirm nothing else in `render.yaml` changed.

---

## Reporting

1. Every command you ran to verify, with actual output — full verbose test runs.
2. Any decision the brief left to you, with your reasoning.
3. Browser verification: which states you exercised and how.
4. Anything you wanted to touch but couldn't because of the ownership boundary.
5. Anything out of scope you found.

If a task is wrong or impossible as specified, stop and say so rather than improvising.
