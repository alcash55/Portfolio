# agents.md — Portfolio

Guidelines for AI agents working in this repo. This is Alex's personal portfolio website.

---

## Tech Stack

| | Technology |
|---|---|
| **Framework** | React 18, TypeScript, Vite |
| **UI** | MUI v5 (@mui/material, @mui/icons-material, @mui/lab), Emotion |
| **Routing** | React Router v6 |
| **Data** | Octokit (@octokit/rest) — GitHub API |
| **Fonts** | Fontsource (Oxygen, Plus Jakarta Sans, Public Sans, Space Grotesk) |
| **Deployment** | GitHub Pages (via `dist/`) |

---

## Project Layout

```
Portfolio/
└── src/
    ├── components/   # Feature components (one folder per component)
    ├── layout/       # Providers, theme, global wrappers
    ├── utils/        # Pure utility functions
    ├── assets/       # Static assets
    ├── App.tsx       # Root: Providers + RouterProvider + Suspense
    └── main.tsx      # Vite entry point
```

---

## Component Conventions

- One folder per component: `src/components/MyComponent/MyComponent.tsx`.
- Named exports only: `export function MyComponent()` — no default exports from components.
- Props interfaces defined inline or in the same file: `interface MyComponentProps { ... }`.
- No `any` — use proper types or `unknown` + type narrowing.

---

## Routing

React Router v6 `createBrowserRouter` pattern. Router definition lives in `src/components/Router/Router.tsx`.

Lazy-load pages to keep the bundle lean:
```tsx
const MyPage = lazy(() => import('../MyPage/MyPage').then(m => ({ default: m.MyPage })));
```

The `Suspense` boundary is in `App.tsx` — don't add per-route ones.

---

## MUI v5

- Use the `sx` prop for one-off styles.
- Use `styled()` from `@mui/material/styles` for reusable styled components.
- Always use `theme.*` tokens for colors and spacing — avoid hardcoded hex/px values.
- Import icons individually: `import GitHubIcon from '@mui/icons-material/GitHub'`.
- `@mui/lab` is available for experimental components (timeline, etc.).

The MUI `ThemeProvider` and any global context providers live in `src/layout/Providers.tsx`. Add new providers there.

---

## GitHub API (Octokit)

```tsx
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: import.meta.env.VITE_GITHUB_TOKEN });
const { data } = await octokit.repos.listForAuthenticatedUser();
```

Env vars are accessed via `import.meta.env.VITE_*` (Vite convention). Secrets go in `.env` — never commit it.

---

## Dev Setup

```bash
yarn dev        # Vite dev server
yarn build      # tsc + vite build → dist/
yarn lint       # ESLint
yarn format     # Prettier
yarn preview    # Preview production build locally
```

Run `yarn format` before committing.
