# Audit clipper, findings only

One repo, several roles. Find real work and write it down. Nobody creates issues, nobody changes
code, nobody commits. `project-manager` files everything afterwards.

## Write findings here

```
/tmp/claude-1000/-mnt-c-Users-Alex-Code-Portfolio/be555b53-1495-450b-a447-46a31e098b87/scratchpad/audit-clipper/<your-role>.md
```

**Append each finding the moment you have it.** Do not compose everything and save at the end. An
earlier audit lost three agents' entire output to a session limit because they buffered, while the
one that wrote progressively kept all of its work.

Every finding carries five things:

- **Path**, with `src/file.ts:42` where a line is the point.
- **What is wrong**, as the observable fact.
- **Why it matters**, naming what breaks or who is affected. No consequence, no finding.
- **Suggested fix**, concrete enough to start from.
- **Size**: small, medium, or large.

Rank worst first. Your ordering becomes the board's.

## The repo

`~/Code/clipper`, pushed to github.com/alcash55/clipper (private) on 2026-08-28. Until today it had
no remote at all, which is why it has never been audited and why a CI branch has been sitting on it
unable to run.

An automated pipeline that pulls popular clips from YouTube (including live VODs), Twitch, and Kick,
converts them to Shorts format (9:16, up to 58s), and uploads them to Alex's channel:

```
fetch candidates -> download (yt-dlp) -> analyze -> format (ffmpeg) -> upload (YouTube API)
```

Facts checked before this brief, so you do not have to:

- 35 TypeScript files under `src/`, 12 test files, 227 tests, all passing on `npm test`.
- Package manager is npm, with a committed `package-lock.json`. Not bun, whatever other repos use.
- `.gitignore` covers `.env`, `client_secret.json`, `.youtube_token.json`, `cookies.txt`. No secret
  has ever been committed, confirmed across full history. Only `.env.example` is tracked, holding
  placeholders.
- Branch `devops/add-node-ci` exists and is pushed. It calls the shared `node-ci.yml` from
  `ac-composite-actions`. It has never run, because the repo had no remote.
- `todo.md` is four lines. There is almost no recorded planning for this project.

## Roles

- **`security-engineer`**: the highest-value pass here. This code shells out to `yt-dlp` and
  `ffmpeg` with input derived from remote sources it does not control, including video titles,
  channel names, and URLs from three platforms. Command construction is the thing to look at.
  Also: OAuth2 refresh token handling for a channel Alex owns, where the token file is gitignored
  but the code path matters, plus what happens to downloaded third-party media on disk.
- **`backend`**: pipeline correctness and robustness. What happens when yt-dlp fails partway,
  ffmpeg produces a zero-byte file, an upload hits a quota error, or the same clip gets processed
  twice. Retry, idempotency, and partial-failure recovery across a long-running multi-stage job.
- **`qa-reviewer`**: 227 tests already pass, so the value is what they miss. The question is what
  could break with every test still green. Pay attention to the stages that touch the filesystem
  and shell out, which are the hardest to cover and the easiest to break.
- **`devops`**: the pending `devops/add-node-ci` branch can finally run. Say whether it is right
  for this repo now that you can check it against a real remote, and what else the repo needs.
  It runs long jobs against external APIs with quotas, which changes what scheduled CI should and
  should not do.
- **`technical-writer`**: the README documents an architecture and a module table. Check both
  against the code. Setup here involves API credentials, OAuth consent, yt-dlp, and ffmpeg, which
  is a lot of steps to get wrong on a fresh machine.

## Judgement

This project uploads to a real YouTube channel and pulls from platforms with terms of service and
rate limits. A finding that would cost Alex an account or a quota ban outranks a code-quality nit.

Volume is not the goal. Ten findings someone will act on beat forty that read like linter output.

`unslop` governs your findings file and your report. No em dashes, sentence case headings, straight
quotes, active voice. These become public issue text under Alex's name.

## Done when

Your file exists, ranked worst first, every finding has its five parts, and your report says how
many findings you wrote and what you could not check.
