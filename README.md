# [Portfolio Website](https://alcash55.github.io/Portfolio/)

This is a website build to showcase my skills and experiences.

## Layout

```
frontend/   React + TypeScript single-page app, deployed to GitHub Pages
backend/    Go + Gin API: contact form + a GitHub proxy for live project data
```

## Architecture

### Frontend

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite Bundle/Build Tool](https://vitejs.dev/)
- [Github Actions CI/CD Pipeline](https://docs.github.com/en/actions)

Notable dependencies:

- [MUI](https://mui.com/)
- [React Router Dom](https://reactrouter.com/en/main)

### Backend

- [Go](https://go.dev/)
- [Gin](https://gin-gonic.com/)

Package layout, one job per package:

| Path                 | Responsibility                                                  |
| -------------------- | --------------------------------------------------------------- |
| `cmd/app/main.go`    | Process lifecycle: load config, start server, graceful shutdown |
| `internal/routes/`   | The whole route tree: middleware, CORS, groups, registration    |
| `internal/handlers/` | Request handlers, one package per domain                        |
| `pkg/config/`        | Reads and validates environment variables                       |

Dependencies are passed as ordinary arguments (`main` → `routes.New(cfg)` →
`contact.New(cfg)`) rather than stashed in the Gin context, so they are checked
at compile time.

## Backend API

### Endpoints

| Method | Route              | Body                          | Responses                                                                                              |
| ------ | ------------------ | ------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `GET`  | `/healthz`         | –                              | `200 {"status":"ok"}`                                                                                    |
| `POST` | `/api/v1/contact`  | `{"name","email","message"}`  | `200` ok · `400` validation · `413` >64 KiB · `429` rate limited · `502` webhook unreachable/rejected     |
| `GET`  | `/api/v1/projects` | –                              | `200 {"projects":[...],"stale":bool}` · `502` if every configured repo failed to fetch                   |

### Contact form

The form posts to the backend, which validates the payload and forwards it to a
Discord webhook:

```
Browser  ──POST /api/v1/contact──>  Go backend  ──>  Discord webhook
```

The webhook URL lives only in the backend's `WEBHOOK_URL`. It is deliberately
**not** a `VITE_` variable: Vite inlines every `VITE_`-prefixed value into the
client bundle, which would make the webhook readable by anyone who views source
on the deployed site.

Field limits: `name` ≤ 100, `email` ≤ 254 and must parse as an email address,
`message` ≤ 1500. The caps keep the rendered Discord message within that API's
2000-character limit.

It's rate limited to 5 requests/minute per client (burst 5), keyed off the rightmost
`X-Forwarded-For` entry, the one a client can't forge past Render's proxy, with a fallback to
the raw peer address in local development. A throttled request gets `429` plus a `Retry-After`
header. `/healthz` and `/api/v1/projects` are deliberately not rate limited; see the comments in
`internal/routes/routes.go` for why each is safe to leave open.

### Live projects data

`GET /api/v1/projects` returns a curated, hand-maintained list of repos (`PROJECT_REPOS`, below),
fetched from the GitHub API and cached for **one hour**, with concurrent refreshes single-flighted
onto one upstream call. If a refresh fails but a previous successful fetch is still cached, that
stale data is served instead (`"stale": true`) rather than erroring. The frontend
(`frontend/src/components/Pages/Projects/useProjects.ts`) merges this over a static fallback list
and never surfaces a failure to the visitor beyond a `console.error`.

## Local development

### Backend

Copy `backend/.env.example` to `backend/.env` and fill it in:

| Variable          | Required | Purpose                                                                                     |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `PORT`            | yes      | Port to listen on, e.g. `8080`. Render injects this automatically                              |
| `WEBHOOK_URL`     | yes      | Discord webhook the contact form forwards to                                                   |
| `GH_TOKEN`        | no       | GitHub token `GET /api/v1/projects` sends when calling the GitHub API. Optional, see below     |
| `ALLOWED_ORIGINS` | no       | Comma-separated CORS origins. Unset uses the defaults below                                    |
| `PROJECT_REPOS`   | no       | Comma-separated repo names (owned by `alcash55`) curated for `GET /api/v1/projects`. Unset defaults to `Little-Town,ac-composite-actions,Royalty-VS-Code-Theme,Portfolio` |

`GH_TOKEN` is genuinely optional. You can run this backend without one. `/api/v1/projects` works
unauthenticated against the public GitHub API (60 requests/hour, and the four default repos behind
a 1-hour cache only cost ~4 requests/hour, well under that). Setting it just raises the limit to
5000/hour. A token that GitHub rejects (expired, revoked, wrong scope) doesn't fail the request
either. The handler retries that one refresh unauthenticated instead.

`.env` is read by [godotenv](https://github.com/joho/godotenv) at startup. Go
does not read `.env` files on its own, and real environment variables always win,
so deployed environments are unaffected.

CORS has two modes, chosen by whether `ALLOWED_ORIGINS` is set:

- **Unset (local development).** Any `localhost` / `127.0.0.1` / `::1` origin is
  allowed **on any port**, plus `https://alcash55.github.io`. Dev servers drift
  to another port when theirs is taken (Vite does this silently unless
  `strictPort` is set), and pinning exact ports turns into whack-a-mole.
- **Set (deployments).** Exact matching against that list only, and localhost is
  not special. `render.yaml` sets it to `https://alcash55.github.io`.

Setting `ALLOWED_ORIGINS` **replaces** the defaults rather than adding to them.

If a browser request gets a `403` on the preflight, the origin is not in the
allowlist. Check which port your dev server actually bound to, since it may not
be the one in `vite.config.ts`.

```sh
cd backend
go run ./cmd/app
```

Tests:

```sh
cd backend
go test ./...        # all packages
go test ./... -race   # same, with the race detector
```

`-race` needs cgo, which needs a C compiler (`gcc`/`cc`) on the machine. It fails with
`requires cgo` if there isn't one. CI has one and runs `-race`; if you don't, `go test ./...`
without the flag still runs every test, just without race detection.

### Frontend

Vite is configured with `envDir: './src'`, so frontend env files live in
`frontend/src/`, not the `frontend/` root. Copy `frontend/src/.env.example` to
`frontend/src/.env`.

| Variable       | Required | Purpose                                               |
| -------------- | -------- | ----------------------------------------------------- |
| `VITE_API_URL` | no       | Backend base URL. Defaults to `http://localhost:8080` |

```sh
cd frontend
bun install
bun run dev     # http://localhost:3005
```

Tests:

```sh
cd frontend
bun run test         # Vitest, single run
bun run test:watch   # Vitest, watch mode
bun run test:e2e     # Playwright smoke test, against a production build
```

`test:e2e` (`frontend/e2e/`) is a small suite of real-Chromium checks for the class of bug that
lint, `tsc --noEmit`, Vitest, and `vite build` all pass on: layout/rendering and runtime-only
failures. It builds the app and serves it with `vite preview` (not the dev server) before running.
Needs the Playwright Chromium browser once: `bunx playwright install chromium` (cached at
`~/.cache/ms-playwright`; CI caches the same path so it isn't re-downloaded every run).

## Continuous integration

`.github/workflows/ci.yml` is a reusable workflow (`workflow_call`) that runs on every pull
request: lint, `tsc --noEmit`, `bun run test`, and `bun run build` for the frontend; the Playwright
smoke test (`frontend/e2e/`) against a production build, in its own job so a smoke failure reads
as distinct from a unit-test failure; and `go vet`, `go test ./... -race`, and `go build` for the
backend.

`.github/workflows/deploy.yml` (push to `main`) calls that same `ci.yml` as a gate before
deploying the frontend to GitHub Pages. A push to `main` only deploys if CI passes. The backend
deploys separately: Render watches `main` directly via the `render.yaml` blueprint and isn't gated
on this repo's CI.

Two more workflows exist outside that path: `keep-alive.yml` pings `/healthz` every 10 minutes to
stop the Render free plan from spinning down (see below), and `check-resume.yml` runs an ATS check
against `frontend/src/assets/AlexResume.pdf` when that file changes. Neither blocks a deploy.

## Deployment

The two halves deploy independently:

| Part        | Host                         | URL                                       | Trigger                                         |
| ----------- | ---------------------------- | ----------------------------------------- | ----------------------------------------------- |
| `frontend/` | GitHub Pages                 | <https://alcash55.github.io/Portfolio/>   | Push to `main` → `.github/workflows/deploy.yml` |
| `backend/`  | [Render](https://render.com) | <https://portfolio-api-0mta.onrender.com> | Push to `main` → `render.yaml` blueprint        |

### Rolling back a Pages deploy

The `github-pages` environment has no required reviewer and no wait timer, so a push to `main`
that passes CI deploys straight to production. If a deploy passes CI but the live site is
still wrong (a runtime bug CI doesn't catch, a bad environment variable, a stale PostHog key),
two recovery paths already work:

- **Revert and push.** `git revert <bad-commit>` on `main` re-triggers `ci.yml` and then
  `deploy.yml` from a clean state. This is the default choice, since it also fixes `main`
  going forward rather than just the live site.
- **Re-run a prior successful deploy.** In the Actions tab, open the last known-good
  `Deploy static content to Pages` run and choose **Re-run all jobs**. This checks out that
  run's commit fresh and rebuilds it rather than replaying a stored artifact, so a repository
  variable changed since that run (`VITE_API_URL`, the PostHog vars) applies to the rebuild
  too. It only works within GitHub's 90-day retention window for that run. Once a run ages
  out, its **Re-run** button disappears and a revert is the only path back.

### Backend on Render

`render.yaml` at the repo root is a [Blueprint](https://render.com/docs/blueprint-spec).
In the Render dashboard: **New → Blueprint**, point it at this repo, and Render
reads the file. It builds `backend/Dockerfile` (`rootDir: backend`, so frontend
changes don't trigger a redeploy) and health-checks `/healthz`.

Set `WEBHOOK_URL` in the Render dashboard. It's marked `sync: false` in the blueprint precisely so
the secret never lives in this repo. `GH_TOKEN` is in the blueprint the same way (`sync: false`)
but is optional at the application level (see the env var table above), so leaving it unset in the
dashboard is fine; `/api/v1/projects` just runs unauthenticated against GitHub.

Two things Render handles that the app relies on:

- **`PORT` is injected** at runtime, so it is deliberately not declared in
  `render.yaml`. The app reads it via `config.Load()`.
- **TLS terminates at Render**, so the service serves plain HTTP internally
  while the public URL is `https://<service>.onrender.com`.

> On the free plan the service **spins down after ~15 minutes of inactivity**, and the next
> request pays a cold start of roughly 50 seconds. Both frontend requests that hit the backend
> allow 60 seconds via an `AbortController` before giving up, rather than hanging indefinitely, so
> a cold start reads as slow, not broken. The contact form shows a "Sending…" state immediately
> and, if the request is still going after 4s, swaps in copy explaining the server is waking up
> (`ConnectForm.tsx`). The projects section shows skeleton cards while its fetch is in flight, then
> renders the real cards, from live data merged over a static fallback, or the static fallback
> alone if the fetch never comes back in time (`Projects.tsx`, `useProjects.ts`). Neither request
> is ever left to hang forever. `.github/workflows/keep-alive.yml` pings `/healthz` every 10
> minutes to make a cold start less likely in the first place. GitHub's `schedule` trigger is
> best-effort, not a guarantee. It can be delayed under load, and GitHub disables `schedule`
> entirely on a repo with no commits for 60 days, so a cold start is mitigated, not eliminated.
> Upgrading off the free plan removes the spin-down altogether.

The repository **variable** (not secret) `VITE_API_URL` points the Pages build at
the API; it is currently set to `https://portfolio-api-0mta.onrender.com`. Keep
it a variable. `VITE_`-prefixed values are inlined into the client bundle, and
Vite inlines **every** `VITE_` variable present at build time, whether the source
references it or not.

`ALLOWED_ORIGINS` is set to `https://alcash55.github.io` in the blueprint. That
**replaces** the local-development defaults rather than adding to them, so the
deployed API accepts only the Pages origin.

### Building the backend image locally

```sh
cd backend
docker build -t portfolio-api .
docker run --rm -p 8080:8080 \
  -e PORT=8080 \
  -e WEBHOOK_URL='https://discord.com/api/webhooks/...' \
  portfolio-api
```

The image is a multi-stage build onto `distroless/static`: no shell, no package
manager, non-root, ~36 MB. `.dockerignore` excludes `.env` so secrets are never
baked into a layer.
