import {
  CHAPTER_COUNT,
  CHAPTER_GROUPS,
  CHAPTER_INDEX_TITLE,
  chapterNumber,
  chapterTitle,
} from '~/content/home';
import { useChapterIndex } from './useChapterIndex';
import { useCurrentChapter } from './useCurrentChapter';

const POPOVER_ID = 'cidx';

// The counter needs the room the wordmark text takes below 480px (Header hides that text). On
// the narrowest phones the title leaves the layout and stays in the button's name, because it
// would cut the total ("01 / 1...").
const COUNTER = [
  'mx-auto flex min-h-11 min-w-0 max-w-max flex-1 items-center justify-center gap-[0.5rem]',
  'rounded-full border-0 bg-transparent px-[0.75rem] cursor-pointer',
  'text-[0.8125rem] text-ink-2 tabular-nums min-[640px]:text-[0.875rem] hover:bg-fill',
  'max-[360px]:gap-[0.25rem] max-[360px]:px-[0.25rem]',
].join(' ');
const COUNTER_TEXT = 'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap';
const COUNTER_TITLE = 'max-[480px]:sr-only';
const COUNTER_NUMBER = 'font-semibold text-ink';

// A native popover under the header. Its centering is a transform, not Tailwind's translate,
// because the open animation moves the translate property and would drag the centering with it.
// Keep `display` off this element: the browser hides a closed popover with it. `cidx` is a
// hook: HomeEffects leaves clicks inside it to the index's own handler.
const INDEX = [
  'cidx',
  'fixed inset-auto top-[calc(var(--hdr)+0.5rem)] left-1/2 m-0 [transform:translateX(-50%)]',
  'w-[min(30rem,calc(100vw-1.5rem))] max-h-[calc(100svh-var(--hdr)-1.5rem)] overflow-auto',
  'rounded-[24px] border border-line bg-surface px-[1rem] pt-[1.1rem] pb-[1rem] text-ink',
  'shadow-[0_24px_70px_#1c191747] backdrop:bg-scrim',
  'motion-safe:open:animate-cidx-in',
].join(' ');
const INDEX_TITLE = 'mb-[0.5rem] ml-[0.75rem] font-display text-[1.5rem] leading-[1.1] font-normal';
const INDEX_GROUP = 'mt-2';
const INDEX_GROUP_TITLE = 'mt-2 mb-1 ml-3 text-[0.8125rem] leading-[1.2] font-medium text-ink-3';
// The current row gets a fill, a heavier weight and an accent bar. The focus ring sits inside the
// row, where the list's scroll box would otherwise clip it.
const INDEX_ROW = [
  'grid min-h-11 grid-cols-[2.25rem_1fr] items-center rounded-[12px] px-[0.75rem] text-base',
  'hover:bg-fill focus-visible:-outline-offset-3',
  'aria-[current=true]:bg-fill-2 aria-[current=true]:font-semibold',
  'aria-[current=true]:[box-shadow:inset_3px_0_0_var(--accent)]',
].join(' ');
const INDEX_NUMBER = 'text-[0.875rem] text-ink-3 tabular-nums';

/**
 * Header counter ("06 / 12 . Golem Miners") and the chapter index it opens.
 * The index is a native popover, so Esc, light dismiss and focus return come
 * from the browser. The list is in the server HTML. Only the counter and the
 * current-row mark need script.
 */
export function ChapterNav() {
  const current = useCurrentChapter();
  const { popoverRef, onKeyDown, onPick } = useChapterIndex();
  const title = chapterTitle(current);

  return (
    <>
      <button className={COUNTER} id="ctr" type="button" popoverTarget={POPOVER_ID}>
        {/* No aria-label: the name comes from the visible text, so it contains it. */}
        <span className={COUNTER_TEXT}>
          <span className="sr">Chapter</span>{' '}
          <b className={COUNTER_NUMBER}>{chapterNumber(current)}</b> / {CHAPTER_COUNT}{' '}
          <span className={COUNTER_TITLE}>&middot; {title}</span>
          <span className="sr">. Open chapter index</span>
        </span>
        <svg
          className="shrink-0"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      <div
        id={POPOVER_ID}
        className={INDEX}
        popover="auto"
        role="dialog"
        aria-labelledby="cidx-h"
        ref={popoverRef}
        onKeyDown={onKeyDown}
      >
        <h2 id="cidx-h" className={INDEX_TITLE}>
          {CHAPTER_INDEX_TITLE}
        </h2>
        <nav aria-label={CHAPTER_INDEX_TITLE}>
          {CHAPTER_GROUPS.map((group) => (
            <section key={group.label} className={INDEX_GROUP}>
              <h3 className={INDEX_GROUP_TITLE}>{group.label}</h3>
              <ol>
                {group.items.map((item) => (
                  <li key={item.n}>
                    <a
                      className={INDEX_ROW}
                      href={`#${item.id}`}
                      data-n={item.n}
                      aria-current={item.n === current ? 'true' : undefined}
                      onClick={() => onPick(item.id)}
                    >
                      <span className={INDEX_NUMBER}>{chapterNumber(item.n)}</span>
                      <span>{item.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </nav>
      </div>
    </>
  );
}
