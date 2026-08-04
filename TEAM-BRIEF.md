# TEAM-BRIEF — Sprint 1: Stop the Bleeding

Scratch file. Deleted at the end of the sprint.

## Goal

Make `main` green and remove stale/broken config. **No behavior changes, no new features, no
refactors beyond what each task names.** Every task below is cleanup with a verifiable end state.

The sprint is done when all four of these pass from a clean checkout:

```sh
cd frontend && bun run lint      # currently 11 errors, 3 warnings -> must be 0/0
cd frontend && bunx tsc --noEmit # currently clean -> must stay clean
cd frontend && bun run build     # currently passes -> must keep passing
cd backend  && go vet ./...      # currently clean -> must stay clean
cd backend  && go build ./...    # must pass
```

## Decisions already made — do not relitigate

1. **Discord webhook is NOT being rotated.** It points at a test channel. Ignore it entirely.
2. **Dev port stays 3005.** The uncommitted 3000→3005 change is already committed as this
   branch's baseline. Fix the stale comments that still say 3000; do not change the port back.
3. **`@octokit/rest` gets removed** — and this is *not* a decision to drop the dynamic-projects
   feature. That feature is confirmed and coming, but it will be fetched **server-side by the Go
   backend**, so a browser-side JavaScript GitHub client is the wrong layer regardless. Removing
   it now prevents anyone reaching for it later. (Verified: zero matches in `src/`.)
4. **`GH_TOKEN` stays exactly as it is** — in `config.Config`, in `config.Load()`, and in the
   README table. The backend projects endpoint will use it. Do not remove it, do not "tidy" it.

## Ownership — strict file boundaries

Two agents work in parallel in separate worktrees. **Do not touch files outside your boundary**,
even if you spot a problem there. Report it instead; it goes in the next sprint's backlog.

| Agent | Owns | Must not touch |
| --- | --- | --- |
| **frontend** | `frontend/**` | `backend/**`, `README.md`, `render.yaml`, `.github/**` |
| **backend** | `backend/**`, `README.md` | `frontend/**` |

There is no interface contract between the two — the tasks are independent. That is deliberate;
it is what makes them parallelizable.

---

## FRONTEND tasks

### F1 — Fix all 11 lint errors and 3 warnings

`bun run lint` runs with `--max-warnings 0`, so warnings fail too.

- `vite.config.ts` — unused `loadEnv` import; unused `{ command, mode }` destructured params.
  Drop them. Keep `envDir`, `base`, `outDir`, `assetsInclude`, and the server block as-is.
- `src/components/Pages/Skills/Skills.tsx` — unused `Grid` import; unused `theme`.
  **Also note:** it imports `useTheme` from `@emotion/react`, not `@mui/material`. Since `theme`
  is unused, delete the import entirely rather than fixing the source.
- `src/components/AppShell/AppShell.tsx` — unused `newLayout`.
- `src/layout/Theme/Context.tsx` — unused `color`.
- `src/components/ConnectForm/useConnectForm.ts` — two `no-useless-escape` on the email regex
  (the `\[` inside the character classes). Remove only the unnecessary backslashes. **Do not
  rewrite or "improve" the regex** — its behavior is covered by Sprint 2 tests that don't exist
  yet, so a silent behavior change here would go undetected.
- `src/components/AppShell/InternalComponents/showNavBar.ts` — **real bug, not a style nit.**
  It calls `useState`/`useEffect` from a function named `showNavBar`, which violates the rules of
  hooks. Rename the function *and its file* to `useShowNavBar`, and update every import site.
  Grep for callers before and after.
- 3 remaining warnings: two `react-refresh/only-export-components` (`AppShell.tsx`,
  `Theme/Context.tsx` — each exports a non-component alongside a component) and one
  `react-hooks/exhaustive-deps` missing `toggleLayout` in `AppShell.tsx:46`.
  Prefer a real fix. If a fix would change runtime behavior, use a targeted
  `// eslint-disable-next-line <rule> -- <reason>` with a written reason. Never a blanket disable.

**Constraint:** these are lint fixes. If removing an unused variable reveals that a block of code
does nothing, say so in your report — do not delete the block.

### F2 — Fix the broken PWA manifest icons

All 5 icon entries in `frontend/public/manifest.json` point at `/Portfolio/src/assets/favicon/*`.
Those paths do not exist in the build output. Verified against a real `bun run build`:

- Vite hashes `src/` assets to `/Portfolio/assets/<name>-<hash>.png`, so the literal `src/` paths
  404 in production.
- `android-chrome-192x192.png` and `android-chrome-512x512.png` are not emitted into `dist/` at
  **all** — nothing imports them, so Vite never sees them.

Fix by moving the favicon set from `src/assets/favicon/` to `frontend/public/favicon/`, so the
files are copied verbatim and the paths are stable and unhashed. Then:

- Update the 5 `src` values in `manifest.json` to the new stable paths.
- Update the 4 favicon `<link>` tags in `frontend/index.html` to match.
  **These currently work** (Vite rewrites them) — do not break them. Verify after the move.
- Fix the wrong `type` on the first link tag: it declares `type="image/svg+xml"` for a `.ico`.

**Verify by building** and confirming every referenced path exists in `dist/`:

```sh
bun run build
cat dist/manifest.json          # then check each src resolves under dist/
ls dist/favicon/                 # all 5 icons present
grep -o 'href="[^"]*favicon[^"]*"' dist/index.html
```

Report the exact `dist/` listing in your summary. "The build passed" is not evidence the icons
resolve — the build passed before this fix too.

### F3 — Delete `frontend/yarn.lock`

`bun.lockb` is authoritative (CI and docs both use Bun). Two lockfiles is a resolution trap.
Delete `yarn.lock` only; leave `bun.lockb` alone.

### F4 — Remove the `@octokit/rest` dependency

Imported nowhere. Remove from `package.json` dependencies and refresh `bun.lockb` via
`bun install`. Confirm `bun run build` still passes afterwards.

### F5 — Fix the `dev:poll` script

`package.json` has `"dev:poll": "vite"` — byte-identical to `"dev"`, so it does nothing. It was
presumably meant to enable filesystem polling for WSL. Either make it real
(`vite --force` is *not* it; polling is `server.watch.usePolling` in config) or delete it.
Deleting is fine and preferred if you can't make it genuinely useful.

---

## BACKEND tasks

### B1 — Remove the 5-second sleep on `GET /`

`backend/internal/routes/routes.go:53` has `time.Sleep(5 * time.Second)` inside the root handler.
Leftover debug code on a public endpoint. Delete the sleep; keep the route and its response text.
Check whether the `time` import is still needed (it is — `MaxAge: 12 * time.Hour` uses it).

### B2 — Fix the stale port comments

The port is **3005** now and stays that way. Two places still say 3000:

- `backend/pkg/config/config.go` — the `defaultAllowedOrigins` doc comment says "port 3000, see
  frontend/vite.config.ts". The values in the slice are already `3005`; only the comment is wrong.
- `README.md` — check the Frontend local-dev section; `bun run dev` is documented as
  `http://localhost:3000`.

While you are in that comment: it is worth noting that these hardcoded localhost entries are
largely redundant now that `AllowAnyLocalhost` accepts any localhost port. **Do not remove them**
this sprint — just make the comment accurate. Flag it for the backlog if you agree.

### B3 — README accuracy pass

Only these, nothing else:

- The dev-server port (see B2).
- Verify the `GH_TOKEN` row is accurate. **It stays** (see Decisions). Confirm the wording
  "Loaded for future use; nothing reads it yet" is still literally true against `config.go`.
- Verify the API response table still matches `contact.go` behavior after B1.

Do not restructure the README, do not reformat tables, do not rewrite prose. The tables were
just prettier-formatted in the baseline commit; leave that formatting alone.

---

## Reporting

End your report with:

1. Every command you ran to verify, with its actual output (not "it passed").
2. Any file you wanted to touch but didn't because of the ownership boundary.
3. Anything you found that is out of scope for Sprint 1 — it goes to the next sprint's list.

If a task turns out to be wrong or impossible as specified, stop and say so rather than
improvising a different change.
