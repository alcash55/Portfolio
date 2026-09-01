# 01. Project detail dialog

**Status:** spec, not started · **Addresses:** project depth (#2 in the review)

## The problem

Every project card is a two-line description and a link out. The Portfolio card,
the one project the visitor is *already inside*, reads "A website built to showcase
my skills and experiences using modern web technologies", which describes nothing.
Behind that card: a Go API with a single-flight 1h cache, rate limiting on a
deliberately-public webhook, a static fallback indistinguishable from a live render,
102 unit tests, and a browser suite that gates every deploy. A visitor sees none of it.

The dialog is the container for that depth. It is also where spec 02's media goes.

## Proposal

Clicking a card opens a modal: large media at the top, then the story, then the tech
it was built with, then the links. Escape and the backdrop close it. No new routes,
no blog.

```
[ card ] ──click──▶ ╔══════════════════════════════╗
                    ║  Little Town             [x] ║
                    ║  ┌────────────────────────┐  ║
                    ║  │   Pauseable video      │  ║
                    ║  └────────────────────────┘  ║
                    ║  The problem                 ║
                    ║  What was hard               ║
                    ║  What I would do differently ║
                    ║                              ║
                    ║  React · Bun · Supabase      ║
                    ║  ★ 42 · TypeScript · Aug 1   ║
                    ║  [ Live site ]  [ GitHub ]   ║
                    ╚══════════════════════════════╝
```

## How it fits the current code

- `staticProjects.ts` is the content source and needs new optional fields (long-form
  sections, tech list, extra media). It already carries `repoName?`, `name`, `img?`,
  `href`, `alt?`, `description`.
- `Projects.tsx` renders each card as a `CardActionArea` with
  `href={project.href} target="_blank"`. **This is the breaking change:** the card
  becomes a button that opens the dialog, and the outbound link moves inside.
- **A test asserts the current behaviour.** `Projects.test.tsx` →
  *"links every card somewhere, including the projects that are not on GitHub"* walks
  every static project and requires an `<a>` with an `http(s)` href. It has to be
  rewritten to assert the dialog opens and *contains* the link. That test exists
  because a missing link is invisible in a screenshot and only hurts keyboard users,
  the replacement must keep that property.
- Live metadata (`stars`, `language`, `updatedAt`) already merges per project via
  `mergeProject`, and the cached-data notice already exists. Both can appear in the
  dialog without new plumbing.
- MUI `Dialog` brings its own focus trap and Escape handling. Accessibility is at
  Lighthouse 100 and must stay there: the dialog needs `aria-labelledby` pointed at
  its title, and focus must return to the originating card on close.
- The section is wrapped in `useScrollReveal`; the dialog renders in a portal, so the
  reveal transform does not affect it.

## Decisions to make

**1. Which projects get long-form content?**
Recommendation: all five, but the depth is uneven on purpose. Portfolio and
Little-Town get the full treatment, the other three get a paragraph.
**Your call:** This project and The Clipper-er should be the only one that gets a long-form section at the moment since they are the most finished projects. The others will get a paragraph about what they are and how they work.

**2. What sections does the dialog body have?**
Recommendation: *The problem* → *What was hard* → *What I'd do differently*. The
third is the one most portfolios skip and the one engineers actually read.
**Your call:**

**3. Where does the content come from?**
Recommendation: hand-written by you in a new `projectDetails.ts`, keyed by project
name. Drafting from the vault notes (`Dev Projects/*.md`) is possible, so say so if you
want first drafts to react to rather than a blank file.
**Your call:**

**4. What happens to the card's outbound link?**
Recommendation: the whole card opens the dialog; the live/GitHub links live inside it.
The alternative, where the card opens the link and a small "Details" button opens the dialog,
keeps one click to the live site but makes the depth easy to miss.
**Your call:** The links should all go to the respective project's github page except for The Clipper-er can be the link that is used today which takes the user to the Youtube channel.

**5. Should the dialog be linkable (e.g. `#projects/little-town`)?**
Recommendation: yes, hash only. A shareable URL that reopens the dialog, without
touching the router. Costs a `useEffect` and a `hashchange` listener.
**Your call:** Yes, the dialog should be linkable.

**6. Mobile behaviour?**
Recommendation: full-screen dialog below `sm`, per MUI's `fullScreen` breakpoint.
**Your call:**Go with the recommendation. But when user user is not on a mobile device I want a very clean and smooth animation when the dialog opens.

## Your direction

<!-- Anything the above does not cover: exact copy, ordering, tone, what to leave out,
     projects to exclude, how much detail per project. Write as much as you like. -->

## Done when

- [x] Clicking any card opens its dialog; Escape, the backdrop, and a close button all dismiss it
- [x] Focus moves into the dialog on open and back to the card on close
- [x] Every project's outbound link is reachable from inside the dialog
- [x] The rewritten link test still fails if a project's link goes missing
- [x] No horizontal overflow at 320px; e2e stays green (`zero console errors`, section visibility)
- [x] Lighthouse accessibility stays at 100

## Risks

- **Depth nobody opens.** If the cards do not signal that there is more behind them,
  the content is invisible, which is worse than the status quo, because the outbound link got
  one click further away. Whatever affordance is chosen has to read as "more inside".
- **Content rot.** Five hand-written stories are five things that go stale. The
  numbers should come from the live API where they already do.
