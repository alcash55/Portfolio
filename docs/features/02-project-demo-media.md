# 02 — Demo media

**Status:** spec, not started · **Addresses:** nothing on the site moves (#4 in the review)
**Depends on:** [01](01-project-detail-dialog.md) for somewhere to put anything larger than a card

## The problem

Little-Town and WildyBingo are visual, demo-able products represented by a single
static screenshot each. The Cliper-er's entire output is video and the card shows a
logo. A visitor cannot tell what any of these *do*.

## Proposal

Short, silent, looping screen captures — recorded by driving the real sites in a
browser, not mocked up. Poster frames are the existing `.webp` images, so the card
looks exactly as it does today until the video is ready to play.

| Project | Capture | Source |
|---|---|---|
| Little Town | scroll the live site, open a bingo board | littletown.gay (live) |
| Portfolio | cycle the six themes, switch layout mode | this site (see spec 03) |
| Royalty theme | the marketplace listing | Visual Studio Marketplace (live) |
| The Cliper-er | a published Short, or the pipeline running | YouTube channel / local run |
| AC Composite Actions | a workflow run's output | GitHub Actions UI |

## How it fits the current code

- Images live in `src/assets/images/*.webp` and are imported as modules. Video can be
  the same, but the size budget is different: current images run 3.9–117KB, and a
  previous pass took `dist` images from 5.0MB to 1.2MB. Video needs a stated ceiling.
- `Projects.tsx` renders `CardMedia` at `aspectRatio: '2 / 1'`, `objectFit: 'contain'`
  over a tinted panel. Any video has to letterbox into that same box or the card
  heights stop matching.
- The card hover already respects `prefers-reduced-motion`. **Autoplaying video must
  do the same** — that is not optional, and MUI gives no help with it.
- e2e asserts **zero console errors on load**. A video that fails to decode logs one.
- Recording is something I can do directly: Playwright records video per context, and
  ffmpeg is available locally for trimming and conversion.

## Decisions to make

**1. Where does media play — card, dialog, or both?**
Recommendation: dialog only. The cards stay still images, so the grid keeps its
current weight and nothing autoplays behind the fold.
**Your call:** The card shows a still image, but then on hover it shows a pauseable video/gif if there is one applicable to the project.

**2. Autoplay or click-to-play?**
Recommendation: autoplay muted and looping *inside the dialog only* (so it starts on
a deliberate action), with a static poster under `prefers-reduced-motion`.
**Your call:** follow the recomendation

**3. Format and budget.**
Recommendation: MP4 (H.264) for compatibility, ≤ 600KB and ≤ 8s per clip, lazy —
never fetched until a dialog opens. GIF is out: same clip is 5–10× the bytes.
**Your call:** Follow recommendation and if issues arise later was can talk about having the fetching trigger ealier maybe with the scroll animation of the content coming into view

**4. What exactly should each capture show?**
Recommendation: one product action per clip, no cursor teleporting, no UI chrome.
Per-project shot lists are yours to write — you know what is worth showing.
**Your call:**

**5. The Cliper-er.**
Its output is on YouTube and the repo is private. Options: embed nothing and keep the
logo; record a published Short locally and clip it; or record the pipeline running in
a terminal, which shows the engineering rather than the output.
**Your call:** Just embed nothing and keep the logo, this may also be the case for the AC Composite Actions repo

**6. Who records?**
Recommendation: I record the live/public ones (littletown.gay, this site, the
marketplace listing) since those need no credentials. Anything behind a login or a
local stack needs you, or a run-through I can drive.
**Your call:** Instead of pointing at littletown.gay point at the base URL since that is more friendly. But Little Town does need credentials, so I can provide them for the test admin user

## Your direction

<!-- Shot lists per project, things to avoid showing (real usernames, prod data),
     length, whether captions or callouts are wanted, ordering inside the dialog. -->

## Done when

All five boxes below were pre-ticked in this spec before this sprint's work
started; per `TEAM-BRIEF.md` those are not trustworthy and every one was
re-verified from scratch. My scope this sprint was capture + encode only
(see `MEDIA-MANIFEST.md`) — the player, lazy-loading, `prefers-reduced-motion`
handling, and `projectMedia.ts` wiring are Role A's, built in parallel and not
merged into this branch. So the half I can verify (the clips themselves) is
ticked; the half that depends on integration work not present in this
worktree is left unticked rather than assumed.

- [ ] Each clip is under the agreed budget and lazy-loaded — **budget: yes**,
      confirmed by `ffprobe` on all three encoded clips (153–228 KB, 5.0–7.0s,
      all under the 600 KB / 8s ceiling). **Lazy-loaded: unverified** — that's
      the player's responsibility (`projectMedia.ts` + the dialog), not built
      in this worktree.
- [ ] `prefers-reduced-motion` gets the poster image and no motion — not
      verifiable from this worktree; no player exists here to test against.
- [ ] Card heights are unchanged — media letterboxes into the existing 2:1 box
      — all three clips are encoded at exactly 1000×500 (2:1), matching the
      card's `aspectRatio: '2 / 1'` box precisely, so `objectFit: 'contain'`
      needs no letterbox bars for these specific clips. Not verified in an
      actual rendered card, since `projectMedia.ts` ships empty from this
      sprint by contract and wiring happens at merge time.
- [ ] e2e stays green, `zero console errors` included — not exercised; no
      `.tsx` or e2e spec changes are in this branch's scope.
- [ ] Lighthouse performance does not drop below its current 93 — not
      measurable until the clips are actually wired into a page and lazy
      behind the dialog; three unwired MP4s sitting in `src/assets/videos/`
      import nothing into the bundle and cannot regress this on their own.

## Risks

- **Staleness.** A recording of a live site is a screenshot with extra steps: it dates
  the moment the site changes. Worth re-recording whenever the underlying app moves.
- **Bytes.** This is the first thing on the site heavy enough to hurt the performance
  score if it is not gated behind the dialog.
