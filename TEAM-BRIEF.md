# TEAM-BRIEF — Sprint 6: Documentation and release

Scratch file. Deleted at the end of the sprint. **Do not cite this file in a comment or in the
docs you write** — it will not exist. This has now been reintroduced in two consecutive sprints,
so treat it as a hard check before you commit: `grep -rn "TEAM-BRIEF" .` over anything you touched.

## Goal

Six sprints changed the architecture out from under the documentation. Both docs now describe a
repo that no longer exists, and one of them actively teaches the security bug this project spent
three sprints designing around.

This is the last sprint before `v1.0.0`. The deliverable is documentation a stranger could follow
without being misled.

## The failure mode you are fixing is drift, so the method is verification, not rewriting

**Every factual claim you write must be checked against the actual repo.** Do not paraphrase the
existing docs — they are wrong, that is why you are here. Read the code, run the commands, and
write what you observed.

If you state a command, run it. If you name a file path, `ls` it. If you describe an endpoint,
read its handler. A doc that is confidently wrong is worse than no doc, which is exactly how the
current one got dangerous.

## Ownership

You own `frontend/agents.md` and `README.md`. Do not change code, tests, workflows, or
`render.yaml` — if you find a code bug while verifying, **report it, don't fix it.**

Do not touch `frontend/src/ideas.md` or `todo.md`; the tech lead is handling those.

---

## Task 1 — `frontend/agents.md` contains actively harmful guidance

This is the priority. Line 74 currently instructs contributors to write:

```tsx
const octokit = new Octokit({ auth: import.meta.env.VITE_GITHUB_TOKEN });
```

**Vite inlines every `VITE_`-prefixed value into the client bundle at build time.** That is not a
style problem — it is precisely how this project's Discord webhook ended up publicly readable in
deployed JavaScript, which is the entire reason the Go backend exists. The doc teaches the bug the
architecture was built to prevent.

It is also impossible to follow: `@octokit/rest` was removed from `package.json` in Sprint 1.

**Delete that section.** Replace it with the pattern the repo actually uses, which Sprint 5 just
shipped: the browser calls `GET /api/v1/projects` on the Go backend, and the GitHub token stays
server-side. Read `frontend/src/components/Pages/Projects/useProjects.ts` and
`backend/internal/handlers/projects/` and describe what is really there.

State the general rule explicitly and prominently, because it is the single most important thing a
contributor to this repo needs to know: **anything secret must never be a `VITE_` variable.** If it
needs a credential, it belongs behind the backend.

Other confirmed inaccuracies — verify each yourself and fix, and look for more:

- The tech-stack table lists Octokit as the data layer. It is not a dependency.
- `src/layout/Providers.tsx` does not exist. There is a `src/layout/Providers/` **directory**.
- Every command is `yarn`. The repo uses **Bun** (`bun.lockb`, and CI runs `bun install`).
  `yarn.lock` was deleted in Sprint 1.
- There is no mention of tests. `bun run test` runs Vitest; there are 65 of them.
- The repo layout section predates the `frontend/` + `backend/` split.

Also worth documenting now that it exists: the theme system (three themes, tokens over hardcoded
colors), the `AppShell` layout switching, and the rule that a `variant="h1"` on MUI `Typography`
renders a real `<h1>` — that caused a duplicate-`h1` bug in Sprint 4.5 and is a genuine trap.

Keep it a working guide, not a changelog. Nobody needs sprint history in a contributor doc.

---

## Task 2 — `README.md`

Verify the whole file; these are the known-wrong parts:

- **`GH_TOKEN`'s row says "Loaded for future use; nothing reads it yet."** Sprint 5's
  `/api/v1/projects` reads it. Also document what it actually does now: it is **optional**, the
  endpoint works unauthenticated (public repos, ~4 requests/hour against a 60/hour limit thanks to
  a 1-hour cache), and a rejected token falls back to an unauthenticated request rather than
  failing. Do not overstate its importance — a reader should come away knowing they can run this
  without one.
- **The cold-start note is out of date.** It says the contact form has no timeout handling. Sprint 3
  added a 60-second `AbortController`, a loading state, and delayed explanatory copy, plus a
  scheduled keep-alive workflow that pings `/healthz` every 10 minutes. Describe the current
  behavior, and keep the honest caveat that GitHub's `schedule` is best-effort and can be delayed.
- **CI is undocumented.** There is a reusable `ci.yml` (lint, `tsc --noEmit`, tests, build for the
  frontend; `go vet`, `go test -race`, `go build` for the backend) that `deploy.yml` calls as a
  gate, plus `keep-alive.yml` and `check-resume.yml`. Explain what runs on a PR versus a push to
  main.
- **How to run the tests is undocumented** — `bun run test` and `go test ./...`. Worth noting
  `-race` needs cgo and so does not work on a machine without a C compiler; CI runs it.
- Document `PROJECT_REPOS` (added in Sprint 5) alongside the other env vars.
- Confirm every documented env var still exists in `pkg/config/config.go`, every command still
  works, and every path still resolves.

Add short "how to run this locally" notes if the README doesn't already cover it end to end. Do not
add a separate `CONTRIBUTING.md` — this project has one contributor and a second file would just be
another thing to drift.

---

## Verification

- Run every command you document, from the directory you say to run it in, and confirm it does what
  you claim.
- `ls`/`grep` every path and identifier you name.
- Confirm no code, test, or workflow file changed: `git status` should show only the two docs.
- `grep -rn "TEAM-BRIEF" README.md frontend/agents.md` must return nothing.

## Reporting

1. Every claim you corrected, with what it said before and what you verified it should say.
2. Every command you ran to verify, with actual output.
3. Anything still inaccurate that you could not fix within your boundary.
4. Any code bug you found while verifying — report, don't fix.

If something in the brief is wrong, say so rather than documenting it as fact.
