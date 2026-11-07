# Portfolio Website

My portfolio: a numbered, scrolling home page with thirteen chapters, a write-up page for each
project and role, a contact form, and a live resume. The site is a server-rendered app on
Cloudflare Workers. A small Go API handles the contact form.

The public address is set in one place, the `VITE_SITE_ORIGIN` build variable (see
[Changing the site URL](#changing-the-site-url)). Today it serves from
<https://portfolio-website.alex-e-cash28.workers.dev>.

## Layout

```
frontend/   TanStack Start app, built with Vite and deployed to Cloudflare Workers
backend/    Go + Gin API: contact form, plus GitHub repo and resume proxies
scripts/    One-off tooling: Golem build publishing, token and webhook wizards
```

## Architecture

### Frontend

- [TanStack Start](https://tanstack.com/start) and [TanStack Router](https://tanstack.com/router),
  server-rendered on [Cloudflare Workers](https://workers.cloudflare.com/)
- [React 19](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) with the Cloudflare plugin, and [Tailwind CSS 4](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/) for unit tests,
  [Playwright](https://playwright.dev/) with axe for browser and accessibility tests
- [PostHog](https://posthog.com/), cookieless, loaded only when a project token is set at build time

How the pieces fit:

- `src/content/` holds the copy and data for every page. Components render it and hold no prose.
- The home page is a stack of `Chapter` sections. `CHAPTER_GROUPS` in `src/content/home.ts`
  drives the chapter counter and the index. Each chapter must fit one screen at 1366×800, and
  `e2e/home-full.spec.ts` checks it.
- Project and role write-ups live at `/projects/:slug` and `/experience/:slug`. Their breadcrumb
  returns to the chapter you opened them from.
- The build runs one script first, `generate-site-stats`. It writes the test counts shown on the
  site into a gitignored file, so no count on the page is typed by hand. It never fails a build
  over missing data.
- The frontend asks the Go API for anything that needs a token. `/resume` is a Worker route that
  fetches `GET /api/v1/resume` and streams the PDF back, or renders an explanation page when the
  API cannot supply it. The AC Composite Actions figure renders a fixed list on the server and,
  after hydration, swaps in `GET /api/v1/ci-actions` if the figure is still below the screen.
- `/play/golem-miners/` is a launcher page. The Unity build is not in the repo or the deploy, so
  the Worker streams it from a GitHub release (see below).

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
| `GET`  | `/api/v1/ci-actions` | –                            | `200 {"actions":[{"name","description"}],"treeSha":"...","stale":bool}` · `502` if the repo tree could not be read and nothing is cached |
| `GET`  | `/api/v1/resume`   | –                              | `200` PDF, fullstack variant · `502` upstream fetch failed and nothing is cached · `503` no `RESUME_GH_TOKEN`/`GH_TOKEN` configured |
| `GET`  | `/api/v1/resume/:variant` | –                        | `200` PDF (`:variant` is `fullstack`, `frontend`, or `backend`) · `404` unknown variant · `502` upstream fetch failed and nothing is cached · `503` no token configured |
| `GET`  | `/api/v1/resume/status` | –                          | `200` diagnostic: token presence, per-variant cache state, last success/failure. See "Diagnosing a broken resume link" below |

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
stale data is served instead (`"stale": true`) rather than erroring. The redesigned frontend does
not call this endpoint. Project data lives in `frontend/src/content/projects.ts`, and the build
reads the numbers it shows from the repos directly.

### Live resume data

`GET /api/v1/resume` and `GET /api/v1/resume/:variant` serve the PDFs attached to the
[Resume](https://github.com/alcash55/Resume) repo's **latest GitHub Release**. That repo's
`build-resume.yml` workflow only cuts a release after a successful build on `main`, tagged by
date, with `fullstack.pdf`, `frontend.pdf`, and `backend.pdf` attached - so a broken build leaves
the previous good resume in place instead of publishing a stale or broken one. Serving a path off
a branch can't make that guarantee, which is why this reads a release rather than a file on
`main`.

Fetching one variant is two calls: `GET /repos/alcash55/Resume/releases/latest` to find the
release and the asset it carries for that variant, then a `GET` of that asset's own API URL (not
its `browser_download_url`) with `Accept: application/octet-stream` for the bytes. Getting that
header wrong is the trap in GitHub's release-asset API: it silently answers 200 with the asset's
JSON metadata instead of the file, so every response is also checked for the `%PDF-` magic bytes
before it's served - a 200 with the wrong body is treated as a failure, not passed through.

Both calls are cached in memory per variant for **10 minutes**, single-flighted the same way
`/api/v1/projects` is, and each cache entry carries the release tag alongside the PDF bytes.
`GET /api/v1/resume` always serves the `fullstack` variant. A successful response carries
`Content-Type: application/pdf`, `Content-Disposition: inline;
filename="Alex-Cash-Resume-<variant>.pdf"`, `Cache-Control: public, max-age=300`, and
`X-Resume-Version: <tag>` naming the release actually served, so a stale-looking resume can be
traced to a specific release rather than guessed at.

Unlike `/api/v1/projects`, there's no unauthenticated fallback: the Resume repo is private, so
every fetch needs a token that can read it. `RESUME_GH_TOKEN` (below) is used when set, and
`GH_TOKEN` is the fallback, which works while that token carries the `repo` scope. No release yet,
a release missing that variant's asset, a failed asset download, and a non-PDF asset body all
resolve to the same outcome: if a previous successful fetch is still cached for that variant, the
stale copy is served instead of erroring - the same behavior that covers a GitHub outage. With
nothing cached yet, an upstream failure of that kind returns `502`. A missing token returns `503`
instead, since it isn't an upstream failure at all - it's a deploy waiting on configuration, and
the two need different responses. Either way the JSON body stays `{"error":"could not load
resume"}`, so this doesn't change what the frontend has to handle.

Every failure logs a distinct, greppable line naming which step failed (`stage=resolve_release`,
`stage=select_asset`, `stage=download_asset`, `stage=verify_pdf`, or `stage=not_configured`) and
the upstream HTTP status where one exists, e.g. `resume: fullstack fetch failed:
stage=resolve_release status=404: unexpected status 404 fetching latest release`. Neither the
token nor the `Authorization` header value is ever part of that line, a response body, or a
response header.

The frontend's `/resume` route fetches `/api/v1/resume` on each visit and streams the PDF back,
so a new release reaches the site without a deploy. If the API answers anything but a PDF, or
takes longer than 35 seconds, `/resume` shows an explanation page instead of an error.

#### Diagnosing a broken resume link

Check `GET /api/v1/resume/status` before opening the Render dashboard:

```json
{
  "tokenConfigured": true,
  "variants": {
    "fullstack": {
      "cached": true,
      "releaseTag": "v2026.09.16",
      "lastSuccessAt": "2026-09-16T12:00:00Z",
      "lastFailureReason": "",
      "lastFailureAt": null
    },
    "frontend": { "cached": false, "releaseTag": "", "lastSuccessAt": null, "lastFailureReason": "", "lastFailureAt": null },
    "backend":  { "cached": false, "releaseTag": "", "lastSuccessAt": null, "lastFailureReason": "", "lastFailureAt": null }
  }
}
```

- `tokenConfigured: false` means no `RESUME_GH_TOKEN` or `GH_TOKEN` was ever set on the service.
  That's the whole fix: create a fine-grained PAT with read-only Contents access to
  `alcash55/Resume`, set it as `RESUME_GH_TOKEN` in the Render dashboard, and redeploy. This is what actually
  broke the endpoint on 2026-09-16, and finding it took a Render dashboard visit because the
  endpoint's only external signal was a 502 indistinguishable from a GitHub outage.
- `tokenConfigured: true` but a variant's `cached: false` with a populated `lastFailureReason`
  means the token is fine and something upstream is failing. The reason string names the stage
  (`stage=resolve_release` is GitHub's release API itself; `stage=select_asset` is a release that
  shipped without that variant's PDF; `stage=download_asset` is the asset download; `stage=verify_pdf`
  is a 200 response that wasn't actually a PDF) and the HTTP status where there is one. Match that
  against the server logs for the full error.
- A variant can show `cached: true` with a recent `lastFailureReason` at the same time: that's the
  stale-on-failure path serving the last good PDF while a refresh keeps failing in the background.
  Visitors see a working resume; this endpoint is what tells you it's still worth investigating.

## Local development

### Backend

Copy `backend/.env.example` to `backend/.env` and fill it in:

| Variable          | Required | Purpose                                                                                     |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `PORT`            | yes      | Port to listen on, e.g. `8080`. Render injects this automatically                              |
| `WEBHOOK_URL`     | yes      | Discord webhook the contact form forwards to                                                   |
| `GH_TOKEN`        | no       | GitHub token that `/api/v1/projects` and `/api/v1/ci-actions` send to the GitHub API. Optional, see below |
| `RESUME_GH_TOKEN` | no*      | Fine-grained GitHub PAT, read-only Contents access to the private `alcash55/Resume` repo. Powers `GET /api/v1/resume[/:variant]`. Optional at boot, but those routes 503 until it's set (check `GET /api/v1/resume/status`) |
| `ALLOWED_ORIGINS` | no       | Comma-separated CORS origins. Unset uses the defaults below                                    |
| `PROJECT_REPOS`   | no       | Comma-separated repo names (owned by `alcash55`) curated for `GET /api/v1/projects`. Unset defaults to `Little-Town,ac-composite-actions,Royalty-VS-Code-Theme,Portfolio` |

`GH_TOKEN` is genuinely optional. You can run this backend without one. `/api/v1/projects` works
unauthenticated against the public GitHub API (60 requests/hour, and the four default repos behind
a 1-hour cache only cost ~4 requests/hour, well under that). Setting it just raises the limit to
5000/hour. A token that GitHub rejects (expired, revoked, wrong scope) doesn't fail the request
either. The handler retries that one refresh unauthenticated instead.

`RESUME_GH_TOKEN` is meant to be a dedicated, narrower-scoped token: reading the private Resume
repo is a bigger grant than `GH_TOKEN`'s job of raising a public-repo rate limit. When unset, it
falls back to `GH_TOKEN` instead of failing outright, since that token currently carries the `repo`
scope and already reads the Resume repo too (see "Live resume data" above for what happens if both
are missing). Set a dedicated token in the Render dashboard to keep the two
endpoints' access separate again.

`.env` is read by [godotenv](https://github.com/joho/godotenv) at startup. Go
does not read `.env` files on its own, and real environment variables always win,
so deployed environments are unaffected.

CORS has two modes, chosen by whether `ALLOWED_ORIGINS` is set:

- **Unset (local development).** Any `localhost` / `127.0.0.1` / `::1` origin is
  allowed **on any port**, plus the v1 site's origin, `https://alcash55.github.io`. Dev servers drift
  to another port when theirs is taken (Vite does this silently unless
  `strictPort` is set), and pinning exact ports turns into whack-a-mole.
- **Set (deployments).** Exact matching against that list only, and localhost is
  not special. `render.yaml` sets it to the Workers origin, `https://portfolio-website.alex-e-cash28.workers.dev`.

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

Frontend env files live in `frontend/`. Copy `frontend/.env.example` to
`frontend/.env`.

| Variable                     | Required | Purpose                                                                                |
| ----------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `VITE_API_URL`                | no       | Go API base URL, used by the contact form, the `/resume` route and the CI actions figure. Defaults to `http://localhost:8080` in dev. A production build without it fails visibly instead of posting to the wrong place |
| `VITE_SITE_ORIGIN`            | no       | Public origin of the site, such as `https://example.com`. Sets canonical links, social cards and the sitemap. Unset, the sitemap uses the request's own origin and canonical links are left off |
| `VITE_POSTHOG_PROJECT_TOKEN`  | no       | PostHog project token, a write-only ingest key, not a secret. Unset disables analytics  |
| `VITE_POSTHOG_HOST`           | no       | PostHog ingest host. Defaults to `https://us.i.posthog.com`. Use the EU host for an EU project |

The build fails if any `VITE_` value looks like a credential, because Vite inlines every one of
them into the client bundle.

`frontend/.env` bakes its values into every local build. Before you build for a browser check,
export the PostHog variables as empty strings so test traffic never reaches the real project:

```sh
export VITE_POSTHOG_HOST= VITE_POSTHOG_PROJECT_TOKEN=
```

```sh
cd frontend
bun install
bun run dev     # http://localhost:3005
```

Other scripts:

```sh
bun run build        # production build, writes the site stats first
bun run preview      # serve the production build locally
bun run lint         # ESLint
bun run typecheck    # tsc --noEmit
bun run format       # Prettier
```

Tests:

```sh
cd frontend
bun run test         # Vitest, single run
bun run test:e2e     # Playwright against a production build, then the analytics specs
```

`test:e2e` (`frontend/e2e/`) runs real Chromium against the production build served through the
Workers runtime, the same bundle that deploys. It catches layout and runtime failures that lint,
`tsc`, Vitest and `vite build` all pass on, and it runs axe on the main pages in light and dark
themes at phone and desktop widths. The default run builds with no PostHog token. A second config,
`playwright.analytics.config.ts`, builds with a made-up token and answers every ingest request with
`page.route`, so nothing reaches a real PostHog project. Every spec stubs the API too, so a
backend running on your machine cannot change a result. Install the browser once with
`bunx playwright install chromium`.

## Continuous integration

`.github/workflows/ci.yml` is a reusable workflow (`workflow_call`) that runs on every pull
request: lint, `tsc --noEmit`, `bun run test`, and `bun run build` for the frontend; the Playwright
suite (`frontend/e2e/`) against a production build, in its own job so a browser failure reads as
distinct from a unit-test failure; and `go vet`, `go test ./... -race`, and `go build` for the
backend.

One more workflow runs outside that path: `keep-alive.yml` pings `/healthz` every 10 minutes to
stop the Render free plan from spinning down (see below). It doesn't block a deploy.

> The production site deploys to Cloudflare Workers by hand. The [old v1 site](https://alcash55.github.io/Portfolio/)
> lives on the protected `v1` branch, whose own `deploy.yml` publishes it to GitHub Pages on a push to `v1`.
> This branch has no Pages workflow, so a push here never touches v1.

The old `check-resume.yml` ATS check is gone: the resume is served live from the Resume repo (see
"Live resume data" below), and the same ATS check runs in that repo's own `resume-analysis.yml`
against all three variants on every PR there.

## Deployment

The two halves deploy independently:

| Part        | Host                                                | Address                                                        | Trigger                                  |
| ----------- | --------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `frontend/` | [Cloudflare Workers](https://workers.cloudflare.com/) | <https://portfolio-website.alex-e-cash28.workers.dev>          | `wrangler deploy` from `frontend/`, by hand |
| `backend/`  | [Render](https://render.com)                        | <https://portfolio-api-0mta.onrender.com>                      | Push to `main` → `render.yaml` blueprint |

### Deploying the frontend

Build with the production values, then deploy. The worker is named `portfolio-website` in
`frontend/wrangler.jsonc`.

```sh
cd frontend
export VITE_API_URL=https://portfolio-api-0mta.onrender.com
export VITE_SITE_ORIGIN=https://portfolio-website.alex-e-cash28.workers.dev
export VITE_POSTHOG_HOST=$(gh variable get VITE_POSTHOG_HOST -R alcash55/Portfolio)
export VITE_POSTHOG_PROJECT_TOKEN=$(gh variable get VITE_POSTHOG_PROJECT_TOKEN -R alcash55/Portfolio)
rm -rf dist
bunx vite build
bunx wrangler deploy
```

Cloudflare serves the built assets and runs the worker for server rendering, the sitemap, the
`/resume` proxy and the Golem build proxy.

To roll back, redeploy the previous commit or use `wrangler rollback`.

### Changing the site URL

Three places hold the address. Change all three together, in this order:

1. **Backend CORS.** Add the new origin to `ALLOWED_ORIGINS` in the Render dashboard. Setting it
   replaces the defaults, so keep the current origin in the list until the switch is done. Without
   this the browser blocks the contact form with a CORS error. `render.yaml` names the current
   Workers origin, so update it to match.
2. **Build variable.** Set `VITE_SITE_ORIGIN` to the new origin and redeploy. This moves canonical
   links, social cards and the sitemap.
3. **Hosting.** Attach the domain to the `portfolio-website` worker in the Cloudflare dashboard
   (Workers & Pages, Settings, Domains & Routes). Then add a `Sitemap:` line to
   `frontend/public/robots.txt` with the new origin.

The old `workers.dev` address keeps working unless you turn it off in the same settings page.

### Golem Miners browser build

`/play/golem-miners/` is a launcher page in `frontend/public/play/golem-miners/`. The Unity files
are not in the repo or the deploy. The 51 MB data file is over the 25 MiB Workers asset limit, so
the Worker (`frontend/src/lib/golemBuild.ts`) streams four files from the Portfolio release tagged
`golem-miners-webgl-latest` and adds the `Content-Encoding: gzip` header Unity needs. Edge and
browser caches hold a file for an hour.

To ship a new build, make a WebGL build with Gzip compression, then run:

```sh
scripts/publish-golem-build.sh path/to/Builds/WebGL/Build <golem-miners-commit>
```

It checks that all four files exist and that the `.unityweb` files are gzip, replaces the release
assets, and needs no Portfolio deploy. It needs a checkout of Portfolio for the script, `gh`, and a
fine-grained token with contents write on this repo, passed as `GH_TOKEN`.

### Backend on Render

`render.yaml` at the repo root is a [Blueprint](https://render.com/docs/blueprint-spec).
In the Render dashboard: **New → Blueprint**, point it at this repo, and Render
reads the file. It builds `backend/Dockerfile` (`rootDir: backend`, so frontend
changes don't trigger a redeploy) and health-checks `/healthz`.

Set `WEBHOOK_URL` in the Render dashboard. It's marked `sync: false` in the blueprint precisely so
the secret never lives in this repo. `GH_TOKEN` is in the blueprint the same way (`sync: false`)
but is optional at the application level (see the env var table above), so leaving it unset in the
dashboard is fine; `/api/v1/projects` just runs unauthenticated against GitHub. `RESUME_GH_TOKEN`
is also `sync: false`; unlike `GH_TOKEN`, leaving it unset means `/api/v1/resume[/:variant]` return
`503` rather than degrading gracefully, since the Resume repo has no public, unauthenticated path
to fall back to. `GET /api/v1/resume/status` reports the missing token directly, without a
dashboard visit. Create the token as a fine-grained PAT with read-only Contents access to
`alcash55/Resume`, then set it in the Render dashboard.

Two things Render handles that the app relies on:

- **`PORT` is injected** at runtime, so it is deliberately not declared in
  `render.yaml`. The app reads it via `config.Load()`.
- **TLS terminates at Render**, so the service serves plain HTTP internally
  while the public URL is `https://<service>.onrender.com`.

> On the free plan the service **spins down after ~15 minutes of inactivity**, and the next
> request pays a cold start of roughly 50 seconds. The contact form allows 60 seconds via an
> `AbortController` (`sendContact.ts`) before it gives up, so a cold start reads as slow, not
> broken. It shows a "Sending..." state immediately and, if the request is still going after 4s,
> swaps in copy explaining the server is waking up (`ContactForm.tsx`).
> `.github/workflows/keep-alive.yml` pings `/healthz` every 10 minutes to make a cold start less
> likely in the first place. GitHub's `schedule` trigger is best-effort, not a guarantee. It can be
> delayed under load, and GitHub disables `schedule` entirely on a repo with no commits for 60 days,
> so a cold start is mitigated, not eliminated.
> Upgrading off the free plan removes the spin-down altogether.

The repository **variable** (not secret) `VITE_API_URL` holds the API address,
`https://portfolio-api-0mta.onrender.com`. Keep it a variable. `VITE_`-prefixed values are inlined into the client bundle, and
Vite inlines **every** `VITE_` variable present at build time, whether the source
references it or not.

Two more repository variables, `VITE_POSTHOG_PROJECT_TOKEN` and `VITE_POSTHOG_HOST`,
configure PostHog the same way. The project token is a write-only ingest key, not a
secret, so it belongs as a variable too. Leave either unset and the build still
succeeds; analytics just stays off, since `frontend/src/lib/analytics.ts`
never loads the SDK without a token. Both values are read at build time, so changing
one needs a rebuild.

`ALLOWED_ORIGINS` is set to the Workers origin, `https://portfolio-website.alex-e-cash28.workers.dev`, in the blueprint. That
**replaces** the local-development defaults rather than adding to them, so the
deployed API accepts only the origins listed. The Render dashboard value overrides the
blueprint and is the one that runs in production. Keep the two in step, and add any new site address
before you switch to it (see "Changing the site URL").

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
