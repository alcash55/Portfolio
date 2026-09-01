# 02. Demo media

**Status:** spec, not started · **Addresses:** nothing on the site moves (#4 in the review)
**Depends on:** [01](01-project-detail-dialog.md) for somewhere to put anything larger than a card

## The problem

Little-Town and WildyBingo are visual, demo-able products represented by a single
static screenshot each. The Cliper-er's entire output is video and the card shows a
logo. A visitor cannot tell what any of these *do*.

## Proposal

Short, silent, looping screen captures, recorded by driving the real sites in a
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
  do the same.** That is not optional, and MUI gives no help with it.
- e2e asserts **zero console errors on load**. A video that fails to decode logs one.
- Recording is something I can do directly: Playwright records video per context, and
  ffmpeg is available locally for trimming and conversion.

## Decisions to make

**1. Where does media play: card, dialog, or both?**
Recommendation: dialog only. The cards stay still images, so the grid keeps its
current weight and nothing autoplays behind the fold.
**Your call:** The card shows a still image, but then on hover it shows a pauseable video/gif if there is one applicable to the project.

**2. Autoplay or click-to-play?**
Recommendation: autoplay muted and looping *inside the dialog only* (so it starts on
a deliberate action), with a static poster under `prefers-reduced-motion`.
**Your call:** follow the recomendation

**3. Format and budget.**
Recommendation: MP4 (H.264) for compatibility, at most 600KB and 8s per clip, lazy,
never fetched until a dialog opens. GIF is out: same clip is 5–10× the bytes.
**Your call:** Follow recommendation and if issues arise later was can talk about having the fetching trigger ealier maybe with the scroll animation of the content coming into view

**4. What exactly should each capture show?**
Recommendation: one product action per clip, no cursor teleporting, no UI chrome.
Per-project shot lists are yours to write, since you know what is worth showing.
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

The five boxes here were pre-ticked before this sprint started and were not
trustworthy, so every one was re-verified from scratch. The clips were recorded
and encoded on their own branch, where the player did not yet exist; these are
the statuses **after integration**, when both halves were finally in one tree
and could be exercised together.

- [x] Each clip is under the agreed budget and lazy-loaded, budget confirmed by
      `ffprobe` on all three (153–228 KB, 5.0–7.0s, against a 600 KB / 8s
      ceiling). Lazy-loading confirmed on the merged branch by a network trace:
      a cold load fetches no `.mp4` until a card is hovered or focused, or a
      dialog opens.
- [x] `prefers-reduced-motion` gets the poster image and no motion, verified
      under `emulateMedia({ reducedMotion: 'reduce' })`: no `<video>` is
      mounted at all, on the card or in the dialog, and the play/pause control
      does not render either.
- [x] Card heights are unchanged, since media letterboxes into the existing 2:1 box,
      all three clips are encoded at exactly 1000×500, so they fill the card's
      `aspectRatio: '2 / 1'` box with no bars. Measured on a rendered card: 283px
      tall with and without a clip.
- [x] e2e stays green, `zero console errors` included. 62 browser tests pass on
      the merged branch, that check among them, and the console stays clean
      while opening dialogs and playing clips, not just on load.
- [ ] Lighthouse performance does not drop below its current 93. **Unresolved,
      deliberately.** Measured on this machine the result was not reproducible:
      one mobile-preset run put the sprint far below `main`, an identical rerun
      put them level, and the desktop preset scored both at 100. That spread is
      environment noise on a shared WSL2 CPU, so it neither confirms nor refutes
      a regression. The clips themselves are lazy and cannot cost anything until
      played; the open question is the hero's eight continuously-animating,
      `will-change`-promoted controls under sustained CPU throttling. Re-measure
      on real hardware or in CI before trusting any number here.

## Risks

- **Staleness.** A recording of a live site is a screenshot with extra steps: it dates
  the moment the site changes. Worth re-recording whenever the underlying app moves.
- **Bytes.** This is the first thing on the site heavy enough to hurt the performance
  score if it is not gated behind the dialog.
