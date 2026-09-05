# Definition of done

Two different questions, kept apart on purpose.

**Is this ticket done?** Same answer in every repo.

**Is this project done?** Different answer in each one, because a live site with
visitors, a Unity prototype at a feasibility gate, a published Marketplace
extension, a dependency other repos pin at `@main`, and a LaTeX file someone
runs `build.sh` on do not share a finish line.

Every criterion below is checkable. "Well tested" is not a criterion. "The test
was proven to fail" is.

## A ticket is done when

**The tests can fail.** Break the product code on purpose, watch the test go
red, restore it, watch it go green. Report both. A test nobody has seen fail is
a claim, not coverage.

> Portfolio issue #57: an e2e test asserted the mobile FAB never overlaps the
> Send button. Its only assertion sat inside an `if` that was never true, so it
> passed for months no matter what the product code did. The scroll sweep never
> came within 170px of the window where the overlap actually happens.

**Assertions are unconditional.** An assertion guarded by a condition is an
assertion that might never run. If a case genuinely does not apply, skip the
test explicitly rather than letting the assertion quietly disappear.

**The change was exercised, not just built.** A green suite is not evidence a
click works. If the change touches UI, open it and use it.

> Portfolio issue #19: React 19 broke the project-dialog click path. Typecheck,
> lint, 178 unit tests and the build all passed. The browser dropped the click
> because a hover-triggered video swap removed the element mid-press. Nothing
> threw, nothing logged.

**Docs match the diff, not the ticket.** The ticket says what was intended. The
diff says what shipped. Read the diff.

> Golem Miners issue #16: the README told new contributors to install a Unity
> version the project had already moved off, so following the setup
> instructions reproduced the bug the previous commit fixed.

**A credential that shipped is part of this ticket.** If a change exposes a
secret, rotation happens now or the decision not to rotate gets written down
with its reasoning. Deleting the line is not rotation, because the value
already shipped.

> Portfolio issue #29: a Discord webhook was inlined into the deployed bundle
> for two years. The considered decision was not to rotate it, because it points
> at a test channel. That decision is recorded in a code comment, which is why
> it survived a later agent trying to reword it.

**Interface changes are additive**, in anything another repo depends on. Adding
an input is safe. Renaming or removing one breaks every caller the moment it
merges.

**The PR body carries real output.** Paste what the commands printed, including
what you could not run and why.

## A project is done when

### Portfolio, a live deployed site

Done means it can sit untouched. Every user-facing path has an e2e test that
has been seen to fail. Accessibility holds at WCAG 2.2 AA with the axe check
gating merges. No secret has ever reached the client bundle, enforced by the
build rather than by review. A dependency bump either passes CI or fails
loudly, never passes while breaking a path nothing covers. Deploys are
reproducible from a clean clone.

Not done while a number displayed on the site is generated from a stale
committed fallback.

### Golem Miners, a Unity prototype

Done for a prototype is a **feasibility verdict**, not a shipped game. It is
done when the core loop is playable end to end in multiplayer with the network
authority questions answered, and when someone can say whether the signature
mechanic works with real players.

That bar needs a test suite to exist first, which is issue #11.

Repo hygiene is separate and already gated: `.gitattributes` with the right
merge drivers, and CI that fails on committed `Library/` or `Temp/`.

### Royalty VS Code Theme, a published extension

Done when every colour pair passes its contrast threshold, checked by a script
that fails the build rather than by eye, and the Marketplace listing matches
what ships.

Already true. This one is the closest to finished, which makes it the useful
reference for what "done" feels like.

### ac-composite-actions, a dependency pinned at `@main`

The hardest to call done, because every consumer takes changes immediately.

Done when each action's declared inputs and outputs are covered by a test that
parses `action.yml` and checks the implementation against it, in both
directions. An output declared but never set is a bug. An output set but never
declared is also a bug, because consumers cannot reference it.

Done also requires no third-party action pinned to a movable tag, and no input
interpolated into a shell `run:` block.

Until v1.0.0 is tagged, "done" here is conditional. Consumers have no way to
hold a version, so every merge is a release.

### Little-Town and Resume

Little-Town is done when its own rules hold under test: `authorizeReal` and the
RSN-rename handling are the parts that break quietly.

Resume is done when `build.sh` produces every variant at one page and
`ats-check.py` passes on all of them. Both already run. The bar is that they
keep running, not that they ran once.

## Applying this

Link here rather than copying. Five copies drift, and the drift is invisible
until two of them disagree.
