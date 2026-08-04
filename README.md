# [Portfolio Website](https://alcash55.github.io/Portfolio/)

This is a website build to showcase my skills and experiences.

## Layout

```
frontend/   React + TypeScript single-page app, deployed to GitHub Pages
backend/    Go + Gin API that handles the contact form
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

| Path | Responsibility |
| --- | --- |
| `cmd/app/main.go` | Process lifecycle: load config, start server, graceful shutdown |
| `internal/routes/` | The whole route tree: middleware, CORS, groups, registration |
| `internal/handlers/` | Request handlers, one package per domain |
| `pkg/config/` | Reads and validates environment variables |

Dependencies are passed as ordinary arguments (`main` → `routes.New(cfg)` →
`contact.New(cfg)`) rather than stashed in the Gin context, so they are checked
at compile time.

## Contact form

The form posts to the backend, which validates the payload and forwards it to a
Discord webhook:

```
Browser  ──POST /api/v1/contact──>  Go backend  ──>  Discord webhook
```

The webhook URL lives only in the backend's `WEBHOOK_URL`. It is deliberately
**not** a `VITE_` variable: Vite inlines every `VITE_`-prefixed value into the
client bundle, which would make the webhook readable by anyone who views source
on the deployed site.

### API

| Method | Route | Body | Responses |
| --- | --- | --- | --- |
| `GET` | `/healthz` | – | `200 {"status":"ok"}` |
| `POST` | `/api/v1/contact` | `{"name","email","message"}` | `200` ok · `400` validation · `413` >64 KiB · `502` webhook unreachable/rejected |

Field limits: `name` ≤ 100, `email` ≤ 254 and must parse as an email address,
`message` ≤ 1500. The caps keep the rendered Discord message within that API's
2000-character limit.

## Local development

### Backend

Copy `backend/.env.example` to `backend/.env` and fill it in:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | yes | Port to listen on, e.g. `8080`. Render injects this automatically |
| `WEBHOOK_URL` | yes | Discord webhook the contact form forwards to |
| `GH_TOKEN` | no | GitHub token. Loaded for future use; nothing reads it yet |
| `ALLOWED_ORIGINS` | no | Comma-separated CORS origins. Unset uses the defaults below |

`.env` is read by [godotenv](https://github.com/joho/godotenv) at startup — Go
does not read `.env` files on its own, and real environment variables always win,
so deployed environments are unaffected.

CORS has two modes, chosen by whether `ALLOWED_ORIGINS` is set:

- **Unset (local development)** — any `localhost` / `127.0.0.1` / `::1` origin is
  allowed **on any port**, plus `https://alcash55.github.io`. Dev servers drift
  to another port when theirs is taken (Vite does this silently unless
  `strictPort` is set), and pinning exact ports turns into whack-a-mole.
- **Set (deployments)** — exact matching against that list only, and localhost is
  not special. `render.yaml` sets it to `https://alcash55.github.io`.

Setting `ALLOWED_ORIGINS` **replaces** the defaults rather than adding to them.

If a browser request gets a `403` on the preflight, the origin is not in the
allowlist — check which port your dev server actually bound to, since it may not
be the one in `vite.config.ts`.

```sh
cd backend
go run ./cmd/app
```

### Frontend

Vite is configured with `envDir: './src'`, so frontend env files live in
`frontend/src/`, not the `frontend/` root. Copy `frontend/src/.env.example` to
`frontend/src/.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | no | Backend base URL. Defaults to `http://localhost:8080` |

```sh
cd frontend
bun install
bun run dev     # http://localhost:3005
```

## Deployment

The two halves deploy independently:

| Part | Host | URL | Trigger |
| --- | --- | --- | --- |
| `frontend/` | GitHub Pages | <https://alcash55.github.io/Portfolio/> | Push to `main` → `.github/workflows/deploy.yml` |
| `backend/` | [Render](https://render.com) | <https://portfolio-api-0mta.onrender.com> | Push to `main` → `render.yaml` blueprint |

### Backend on Render

`render.yaml` at the repo root is a [Blueprint](https://render.com/docs/blueprint-spec).
In the Render dashboard: **New → Blueprint**, point it at this repo, and Render
reads the file. It builds `backend/Dockerfile` (`rootDir: backend`, so frontend
changes don't trigger a redeploy) and health-checks `/healthz`.

Set `WEBHOOK_URL` in the Render dashboard — it is marked `sync: false` in the
blueprint precisely so the secret never lives in this repo.

Two things Render handles that the app relies on:

- **`PORT` is injected** at runtime, so it is deliberately not declared in
  `render.yaml`. The app reads it via `config.Load()`.
- **TLS terminates at Render**, so the service serves plain HTTP internally
  while the public URL is `https://<service>.onrender.com`.

> On the free plan the service **spins down after ~15 minutes of inactivity**,
> and the next request pays a cold start of roughly 50 seconds. The contact form
> has no timeout handling, so the first submission after an idle period will just
> appear to hang. Upgrading off the free plan, or pinging `/healthz` on a
> schedule, avoids this.

The repository **variable** (not secret) `VITE_API_URL` points the Pages build at
the API; it is currently set to `https://portfolio-api-0mta.onrender.com`. Keep
it a variable — `VITE_`-prefixed values are inlined into the client bundle, and
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

The image is a multi-stage build onto `distroless/static` — no shell, no package
manager, non-root, ~36 MB. `.dockerignore` excludes `.env` so secrets are never
baked into a layer.
