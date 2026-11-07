// Styles shared by the write-up pages and the 404 pages, which wear the same frame.

/** The 78rem content column, matching the footer's measure. */
export const PAGE_FRAME = 'mx-auto max-w-[78rem] px-(--gutter)';

/**
 * Anything inside that can take focus or a hash stays clear of the header and the breadcrumb
 * together (SC 2.4.11). It is a descendant rule because the targets belong to other components
 * (figures, the contact form) that this one only contains.
 */
// One literal on purpose: Tailwind finds classes by scanning for whole tokens in the source.
export const CLEAR_OF_CHROME =
  '[&_:is(a[href],button,input,textarea,[tabindex],[id])]:scroll-mt-[calc(var(--hdr)+var(--crumb)+16px)]';

export type PillVariant = 'primary' | 'secondary';

// The transition has two durations, which Tailwind's single duration utility cannot express.
const PILL_BASE = [
  'inline-flex min-h-12 items-center justify-center gap-[8px]',
  'rounded-full border-[1.5px] px-[24px] py-[12px] min-[768px]:py-0',
  'text-center text-base leading-[1.2] font-medium min-[768px]:whitespace-nowrap',
  'cursor-pointer active:translate-y-px',
  '[transition:background-color_var(--duration-press)_linear,transform_var(--duration-lift)_var(--ease-lift)]',
].join(' ');

/** The pill-shaped link button. Use `primary` for the one main action on a page. */
export const PILL: Record<PillVariant, string> = {
  primary: `${PILL_BASE} border-transparent bg-accent text-on-accent hover:bg-accent-hover`,
  secondary: `${PILL_BASE} border-line-strong bg-transparent text-ink hover:bg-fill`,
};
