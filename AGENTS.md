# Portfolio agent instructions

Alex's portfolio. `frontend/` is a TanStack Start app on Cloudflare Workers, `backend/` is a Go and Gin API on Render. `README.md` has the setup, endpoints, CI and deploy steps. `DEFINITION-OF-DONE.md` says when a ticket is done. Read both before a non-trivial change.

## Branches

- `main` is the redesign and the source of the live site. Work branches from `dev` and returns to `dev` by PR. `dev` reaches `main` by PR.
- `v1` is the retired site, protected. Its own `deploy.yml` publishes it to GitHub Pages on a push to `v1`. Leave it alone and keep any Pages workflow off every other branch.
- Commit messages say what changed and why. No `Co-Authored-By` trailer, no "Generated with" line.

## Commands

Bun runs everything in `frontend/`. Read the lockfile before assuming a package manager in any other repo.

- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`: the four CI gates.
- `bun run test:e2e` builds the production bundle and serves it through the Workers runtime. It runs the main Playwright config, then `playwright.analytics.config.ts`.
- Backend: `go vet ./...`, `go test ./... -race`, `go build ./...` from `backend/`.

Run one test chain at a time. Two Playwright or vitest runs at once fight over ports and give false failures.

## Gotchas

**PostHog token.** `frontend/.env` holds the real token and Vite bakes it into every local build, so `unset` does nothing. Before any build you will open in a browser, run `export VITE_POSTHOG_HOST= VITE_POSTHOG_PROJECT_TOKEN=` and confirm `grep -l 'phc_' dist/client/assets/*.js` prints nothing. Never open or print `.env`. Tests use a dummy token and a `page.route` intercept, so no test traffic reaches the real project.

**E2E stubs the API.** The e2e build sets `VITE_API_URL=http://api.invalid`, and `e2e/fixtures.ts` answers every API call the browser makes. A `failed to lookup address` line from the web server is expected. A new API call needs a stub in the fixtures, or the suite depends on whatever runs on your machine.

**Stale dev server.** The repo sits on a `/mnt/c` mount where Vite's file watcher misses changes. Restart the dev server, or measure against a fresh `vite preview`, before reporting any layout result.

**Fade-in sections.** Chapters fade in with `[data-rv="in"]`. An axe or screenshot check that runs mid-fade reads low contrast. Wait for those elements to reach opacity 1 first.

**Chapter fit.** Each home chapter must fit one screen at 1366x800. `e2e/home-full.spec.ts` enforces it.

**Rate limiting.** Key the limiter on the rightmost `X-Forwarded-For` entry. Under Render's trust-all proxy setting, gin's `ClientIP()` returns the leftmost entry, which the client controls. Test both directions: rotating forged headers gets limited, and two real clients get separate buckets.

**Copy.** `src/content/` holds all prose and components hold none. Use US spelling (color, gray, labeled, center). Test counts on the site come from `generate-site-stats`, so type no count by hand.

**No email on the site.** Visitors reach Alex through the form, LinkedIn or the resume. Show no address, no `mailto:` link and no email in structured data. `e2e/contact-copy.spec.ts` checks the main pages.

**Phones and small tablets.** Home scroll snap starts at 900px, since a chapter fits one screen only from there. Golem Miners needs a keyboard and mouse, so its play link and note hide below 1024px (`desktopOnly` in `src/content/`).

**Styling.** Tailwind 4 with tokens in `src/styles.css`. Add new component styles as utilities or under `@layer components`.

## Security

Probe security work yourself. A green suite shows a limiter matches its own tests, not that it resists attack. A secret that shipped needs rotation now, or a written reason in a code comment. Deleting the line does not rotate it.

## Deploys

- The frontend deploys to the `portfolio-website` Worker. Run `wrangler deploy` from `frontend/` with the production `VITE_*` values from the README. Cloudflare Workers Builds tracks `main`.
- The backend deploys from a push to `main` through `render.yaml`. A new site origin goes into `ALLOWED_ORIGINS` first, or the browser blocks the contact form.
- Changing the site URL means three edits in order: backend CORS, `VITE_SITE_ORIGIN`, then the Cloudflare domain. The README has the steps.

## Workspace

Keep all Portfolio work inside this directory. Preserve unrelated edits.

- Put extra worktrees under the primary checkout's `.worktrees/<task-name>/`. Find the primary checkout with `git worktree list --porcelain`. Create no sibling directories under `~/Code`.
- Check the path an app-managed worktree returns. If it lands outside this project, use the current checkout unless Alex asks for the external location.
- Keep notes, research, generated assets and scratch files in the project or its ignored scratch directories. Record durable decisions in the Obsidian project note, not in repo files.
- `TEAM-BRIEF.md` is deleted each sprint. Cite no brief or scratch file in a code comment, because the reference dangles.
- Before finishing, run `git worktree list --porcelain` and `git status --short` to confirm the work stayed here and unrelated edits are intact.
