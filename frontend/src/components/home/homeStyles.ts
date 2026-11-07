// Looks shared by the home chapters, the people chapters built on them, and the contact page.
//
// px stays px and rem stays rem, as the old stylesheet had them: the root font size grows above
// 1440px wide, so a rem-based Tailwind step (gap-4, p-3.5) would drift from these there.
// Each class is one literal on purpose: Tailwind finds classes by scanning for whole tokens.
//
// max-[Npx] is exclusive (width below N) while min-[Npx] is inclusive. The breakpoints in this
// folder are 360, 480 and 900 for "up to 359px", "up to 479px" and "up to 899px".

// ---------- Chapter frame ----------

// One chapter is one screen on a desktop: two flexible spacers (the ::before and ::after) center
// the pair in the space under the header. The top spacer never shrinks below 1.5rem, so a pair
// that nearly fills the screen keeps its gap above. Scroll snapping lives in styles.css.
export const CHAPTER = [
  'chapter mx-auto max-w-[max(78rem,70vw)] px-(--gutter) py-[40px]',
  'min-[900px]:flex min-[900px]:min-h-[calc(100svh-var(--hdr))] min-[900px]:flex-col',
  'min-[900px]:pt-0 min-[900px]:pb-6',
  "min-[900px]:before:min-h-6 min-[900px]:before:flex-[1_1_0px] min-[900px]:before:content-['']",
  "min-[900px]:after:flex-[1_1_0px] min-[900px]:after:content-['']",
  'min-[1024px]:pr-[calc(var(--gutter)+24px)]',
].join(' ');

export type PairColumns = 'even' | 'media' | 'mediaReversed' | 'portrait';

// Side by side from 900px. Recordings and diagrams take the wider column, and About gives its
// portrait a little more than its text.
export const PAIR_COLUMNS: Record<PairColumns, string> = {
  even: 'min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]',
  media: 'min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]',
  mediaReversed: 'min-[900px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
  portrait: 'min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]',
};

export const PAIR = [
  'pair relative grid items-start gap-[28px]',
  'min-[900px]:w-full min-[900px]:gap-[64px]',
].join(' ');

// The prose column. Its paragraphs get their defaults from the column, with :where() so the
// specificity stays at one element and a class on the paragraph (PROOF, an experience chapter's
// stack line) still wins.
export const PROSE = [
  'prose min-[900px]:self-center',
  '[:where(&)_p]:mb-[14px] [:where(&)_p]:max-w-[52ch]',
  '[:where(&)_p]:text-[1.0625rem] [:where(&)_p]:text-ink-2',
].join(' ');

// Size and color come from the column's paragraph defaults, so the overline reads at the prose
// size in the second text color. That is how it shipped.
export const OVERLINE = 'font-medium leading-[1.2] tracking-[0.08em] uppercase';

// A proof line, and About's availability line.
export const PROOF = 'font-medium text-ink';

// The focus ring sits a little farther out than the default on a heading, so it clears the glyphs.
const HEADING_FOCUS = 'focus-visible:outline-offset-[6px]';
export const CHAPTER_HEADING = [
  'mb-[16px] font-display text-page font-normal tracking-[-0.015em] text-balance',
  `[word-spacing:0.06em] ${HEADING_FOCUS}`,
].join(' ');
export const ABOUT_HEADING = [
  'mb-[18px] font-display text-about font-normal tracking-[-0.02em] text-balance',
  `[word-spacing:0.06em] ${HEADING_FOCUS}`,
].join(' ');

// ---------- Links and buttons ----------

// For a link to something that needs a keyboard and mouse, like the Golem Miners browser build.
// max-[1023px] leaves the element's own display alone from 1024px up.
export const DESKTOP_ONLY = 'max-[1023px]:hidden';

// Only the link text is a click target. The prose beside it and the figure are not.
export const LINK_ROW = 'mt-[8px] flex flex-wrap items-center gap-x-[20px] gap-y-[4px]';

// Pixels, not rem: the 44px tap minimum should not grow with the root size on wide screens.
// The base reset removes underlines, and these links sit apart from body text, so they keep the
// line and color is not the only cue.
export const TEXT_LINK = [
  'inline-flex min-h-[44px] items-center',
  'font-medium underline decoration-[1.5px] underline-offset-[4px]',
].join(' ');

// The write-up link: accent colored, with an arrow that nudges right on hover.
export const GO_LINK = [
  'group inline-flex min-h-11 items-center gap-[8px]',
  'font-semibold text-accent hover:underline hover:underline-offset-[5px]',
].join(' ');
export const GO_ARROW = [
  'motion-safe:transition-transform motion-safe:duration-(--duration-slow)',
  'motion-safe:ease-(--ease-lift) motion-safe:group-hover:translate-x-[4px]',
].join(' ');

// A small line beside the links: a private-code notice, a file size, a certificate's details.
export const NOTE = [
  'inline-flex min-h-11 flex-wrap items-center gap-x-[0.5em] gap-y-[0.25em]',
  'text-[0.9375rem] text-ink-2',
].join(' ');

export type ButtonVariant = 'primary' | 'secondary';

const BUTTON_SHAPE = [
  'inline-flex min-h-[48px] items-center justify-center',
  'rounded-full border-[1.5px] text-base leading-none font-medium cursor-pointer',
].join(' ');
const BUTTON_COLORS: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border-line-strong bg-transparent text-ink hover:bg-fill',
};

// The fade is a single short duration, and the padding eases in on the narrowest phones.
const BUTTON_FADE = [
  'px-[24px] max-[360px]:px-[18px]',
  'transition-[background-color] duration-(--duration-press) ease-linear',
].join(' ');

/** The pill buttons on the About chapter. Use `primary` for the one main action. */
export const BUTTON: Record<ButtonVariant, string> = {
  primary: `${BUTTON_SHAPE} ${BUTTON_FADE} ${BUTTON_COLORS.primary}`,
  secondary: `${BUTTON_SHAPE} ${BUTTON_FADE} ${BUTTON_COLORS.secondary}`,
};

/** The same outline pill without the hover fade and the narrow-phone padding: Education and the contact page. */
export const OUTLINE_BUTTON = `${BUTTON_SHAPE} px-[24px] ${BUTTON_COLORS.secondary}`;
