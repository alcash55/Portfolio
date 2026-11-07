// Looks shared by the figures.
//
// px stays px and rem stays rem, as the old stylesheet had them: the root font size grows above
// 1440px wide, so a rem-based Tailwind step (gap-4, p-3.5) would drift from these there.
// Each class is one literal on purpose: Tailwind finds classes by scanning for whole tokens.

// The play button and the gallery thumbnails share this keyboard ring: a 3px paper outline and a
// 3px ring shadow, both against the edge. Kept as shipped. The outline paints over the shadow in
// the same band, so only the paper color shows.
export const FOCUS_RING = [
  'focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-paper',
  'focus-visible:shadow-[0_0_0_3px_var(--ring)]',
].join(' ');

// ---------- Caption row ----------

// The boxed caption under a recording: a title and, for a gallery clip, a line about it. Inside
// a Fig frame the frame carries the caption, so these figures leave this row out.
export const CAPTION_ROW = [
  'mt-[16px] flex flex-wrap items-center gap-x-[16px] gap-y-[8px]',
  'rounded-[20px] border border-line bg-surface px-[20px] py-[14px]',
].join(' ');
export const CAPTION_TITLE =
  'font-display text-[1.375rem] leading-[1.1] font-normal [word-spacing:0.05em]';
export const CAPTION_TEXT = 'text-[0.9375rem] text-ink-2';
