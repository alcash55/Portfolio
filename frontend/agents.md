# agents.md — Portfolio (frontend)

Guidelines for AI agents working in this half of the repo. This is Alex's personal portfolio
website. The repo also has a `backend/` (Go + Gin API) — see the root `README.md` for how the two
halves fit together and deploy; this file only covers `frontend/`.

---

## Tech Stack

| | Technology |
|---|---|
| **Framework** | React 18, TypeScript, Vite |
| **UI** | MUI v5 (@mui/material, @mui/icons-material, @mui/lab), Emotion |
| **Routing** | React Router v6 |
| **Data** | `fetch` against the Go backend (`VITE_API_URL`) — no client-side GitHub SDK; see "Calling the backend" below |
| **Testing** | Vitest, React Testing Library |
| **Fonts** | Fontsource (Oxygen, Plus Jakarta Sans, Public Sans, Space Grotesk) |
| **Deployment** | GitHub Pages, via `.github/workflows/deploy.yml` building `dist/` |

---

## Project Layout

```
Portfolio/
├── frontend/    this half — everything below is relative to here
├── backend/     Go + Gin API (contact form + GitHub proxy), separate module
└── render.yaml  backend deploy blueprint

frontend/
└── src/
    ├── components/    # Feature components (one folder per component)
    ├── layout/        # Theme + AppShell providers (see "MUI v5" below)
    ├── assets/        # Static assets (images, icons, resume PDF, global CSS)
    ├── App.tsx         # Root: Providers + RouterProvider + Suspense
    ├── main.tsx        # Vite entry point
    └── setupTests.ts   # Vitest / Testing Library setup
```

There is no `utils/` directory today — don't assume one exists.

---

## Component Conventions

- One folder per component: `src/components/MyComponent/MyComponent.tsx`.
- Export style is mixed and that's the real convention: top-level page sections under
  `src/components/Pages/` (`Home`, `About`, `Landing`, ...) use `export default`, re-exported from
  an `index.tsx` in the same folder; smaller/reusable components (e.g. everything under
  `AppShell/InternalComponents/`) use named exports (`export const MyComponent = () => ...`).
  Match whichever pattern the folder you're editing already uses.
- Props interfaces defined inline or in the same file: `interface MyComponentProps { ... }`.
- No `any` — use proper types or `unknown` + type narrowing.

---

## Routing

`src/components/Router/Router.tsx` defines exactly one `createBrowserRouter` route (`/`),
rendering `Pages.Home` with `Pages.Error` as its `errorElement`. This is a single-page site —
`Home` renders every section (`Landing`, `About`, `Experience`, `Skills`, `Projects`, `Contact`)
as static child components, not separate routes.

`Pages/index.ts` imports every page statically on purpose, **not** with `React.lazy()` — that was
tried and reverted (see the comment there for the measured before/after). Since `Home` renders
every page unconditionally, lazy-loading only added a Suspense stall and more chunks for the same
bytes. Only reach for `lazy()` for something that's actually conditionally rendered.

The `Suspense` boundary in `App.tsx` wraps `RouterProvider` (as its `fallbackElement`) — don't add
per-route ones.

---

## MUI v5

- Use the `sx` prop for one-off styles.
- Use `styled()` from `@mui/material/styles` for reusable styled components.
- Always use `theme.*` tokens for colors and spacing — avoid hardcoded hex/px values.
- Import icons individually: `import GitHubIcon from '@mui/icons-material/GitHub'`.
- `@mui/lab` is available for experimental components — used today by `Experience` for `Timeline`.

The MUI `ThemeProvider` and the `AppShell` layout provider live in `src/layout/Providers/`
(a **directory**, `index.tsx` inside it — there is no single `Providers.tsx` file). Add new global
providers there.

**Trap:** MUI's `Typography` maps `variant` to a real HTML tag by default, so `variant="h1"`
renders an actual `<h1>` even if you only wanted the size. `SidebarNav`'s brand label sidesteps
this with `variant="h1" component="div"` specifically to avoid a second `<h1>` next to `Landing`'s
real one — this has shipped as a real duplicate-heading bug before, not just a hypothetical one.
Set `component` explicitly whenever you use a heading `variant` for anything other than that
section's actual heading.

### Theming

Three themes — `redTheme`, `darkTheme` (default), `blueTheme` — live in `src/layout/Theme/`, built
with MUI's `createTheme` and swapped at runtime via `ColorModeContext`
(`src/layout/Theme/Context.tsx`). The active theme name persists to `localStorage` (`"theme"`) and
is read back on mount. Add a new theme by exporting a new `createTheme`-based object and wiring it
into `toggleColorMode`.

### AppShell layout

`AppShellProvider` (`src/components/AppShell/AppShell.tsx`) tracks a `default` / `sideNav` /
`mobile` layout mode via `AppShellLayoutContext`. Below the `650px` breakpoint, mobile always wins
regardless of stored preference; above it, the last `default`/`sideNav` choice — persisted to
`localStorage` under `"layout"` — applies. Toggle it with `toggleLayout` from the context rather
than writing to `localStorage` directly.

---

## Calling the backend

**Never put a secret in a `VITE_` variable.** Vite inlines every `VITE_`-prefixed value into the
client bundle at build time — whether the code references it or not — so anyone can read it by
viewing source on the deployed site. This is exactly how this project's Discord webhook used to
leak; the Go backend (`backend/`) exists specifically so secrets stay server-side. If a feature
needs a credential, put it behind a backend endpoint, never in a `VITE_*` variable.

The one env var the frontend does define, `VITE_API_URL`, is not a secret — it's just the
backend's base URL (defaults to `http://localhost:8080`; see `frontend/src/.env.example`).

Live project data (stars, description, language, last-updated) is fetched from the backend rather
than GitHub directly:

```ts
// frontend/src/components/Pages/Projects/useProjects.ts
const response = await fetch(`${API_URL}/api/v1/projects`);
```

The handler serving it lives in `backend/internal/handlers/projects/`: it holds the GitHub token
(`GH_TOKEN`, optional server-side — see the root `README.md`), calls the GitHub API from the
server, and returns a fixed JSON contract (`{ projects: [...], stale: boolean }`). The browser
never talks to GitHub and never sees a token. `useProjects` treats `apiProjects === null` — still
loading, or any non-2xx status, timeout, or network failure — as "fall back to the static project
list"; it never needs to know *why* the fetch failed.

There is no client-side GitHub SDK in this repo — `@octokit/rest` is not a dependency (it was
dropped from `package.json` well before this pattern existed). Don't add a GitHub client to the
frontend; anything that needs GitHub goes through the backend.

---

## Dev Setup

Run from `frontend/`:

```bash
bun install
bun run dev          # Vite dev server, http://localhost:3005
bun run build        # tsc + vite build + sitemap generation -> dist/
bun run lint         # ESLint
bun run format       # Prettier
bun run preview      # Preview production build locally
bun run test         # Vitest, single run
bun run test:watch   # Vitest, watch mode
```

Run `bun run format` and `bun run lint` before committing. CI (`.github/workflows/ci.yml`) runs
lint, a type check, the test suite, and the build on every PR, and gates deploys on all of it
passing — see the root `README.md` for details.
