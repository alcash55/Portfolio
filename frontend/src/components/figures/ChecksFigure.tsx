import { Fragment, useEffect, useState, type RefObject } from 'react';
import { CHECK_ROWS, checkRowsFrom, type CheckRow } from '~/content/checks';
import { apiUrl } from '~/lib/apiUrl';
import { countWord, fetchCiActions, type RepoAction } from '~/lib/ciActions';
import { cssVars, useInView } from './hooks';

// The Fig frame around this is the only card, so the panel has no border or shadow of its own.
// A desktop chapter fits one screen, so from 900px the panel tightens to leave room. The rows
// come from the API, so their count moves. Ten rows fit at a 5px row padding. An eleventh
// makes the chapter taller than the screen, and e2e/home-full.spec.ts says so.
const PANEL = [
  'grid gap-[12px] px-[18px] pt-[18px] pb-[8px]',
  'min-[900px]:gap-[8px] min-[900px]:pt-[12px] min-[900px]:pb-[4px]',
].join(' ');
const HEADING = 'flex justify-between gap-[12px] text-[0.9375rem] font-semibold';
const LIST = 'overflow-hidden rounded-[14px] border border-line bg-paper';
// Every row is passed in the HTML. While the panel plays, each row sets --t, how long its spinner
// shows before its tick and label come in.
const ROW = [
  'grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-[12px]',
  'border-t border-line px-[14px] py-[12px] first:border-t-0 min-[900px]:py-[5px]',
  'motion-safe:in-data-run:[--t:calc(var(--i)_*_520ms_+_600ms)]',
].join(' ');
const ICON = 'relative size-[20px] text-accent';
const ICON_SHAPE = 'absolute inset-0';
const SPINNER = `${ICON_SHAPE} text-ink-3 opacity-0 motion-safe:in-data-run:animate-ck-spinner`;
const TICK = `${ICON_SHAPE} motion-safe:in-data-run:animate-ck-tick`;
const NAME = 'grid min-w-0 gap-[2px]';
const MONO = 'font-[family-name:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace]';
const ACTION = `${MONO} text-[0.9375rem] leading-[1.25] font-medium wrap-break-word`;
const DOES = 'text-[0.8125rem] text-ink-2';
const PASSED = 'text-[0.875rem] font-medium text-accent motion-safe:in-data-run:animate-ck-passed';
// A phone shows the first rows and a button for the rest, so the heading above the figure is
// not two screens away. From 900px every row shows and the button is hidden.
const SHOWN_ON_PHONE = 4;
const MORE = [
  'min-[900px]:hidden justify-self-start rounded-full border border-line px-[14px] py-[10px]',
  'text-[0.875rem] font-medium text-ink hover:bg-band',
].join(' ');
const FOOTNOTE = 'pb-[6px] text-[0.8125rem] text-ink-3';
const FOOTNOTE_CODE = `${MONO} wrap-anywhere`;

type LoadActions = () => Promise<readonly RepoAction[] | null>;

const loadFromApi: LoadActions = () =>
  // Wrapped so the call keeps `window` as its receiver.
  fetchCiActions({ fetch: (input, init) => fetch(input, init), apiUrl: apiUrl() });

/**
 * The server renders the fallback rows and the browser asks the API after hydration. An SSR
 * fetch would hold the first byte of the home page for as long as a cold API takes to wake,
 * about 30 seconds on Render's free tier, to update one figure below the fold. The answer
 * only replaces the rows while the figure is wholly below the screen, where a change in its
 * height moves nothing the reader can see. Otherwise the fallback stays for this visit.
 */
function useCheckRows(ref: RefObject<Element | null>, load: LoadActions): readonly CheckRow[] {
  const [rows, setRows] = useState(CHECK_ROWS);
  useEffect(() => {
    let live = true;
    void load().then((actions) => {
      const el = ref.current;
      if (!live || !actions || !el) return;
      if (el.getBoundingClientRect().top >= window.innerHeight) setRows(checkRowsFrom(actions));
    });
    return () => {
      live = false;
    };
  }, [ref, load]);
  return rows;
}

/**
 * A pull request checks panel with every row passed. That is the state the server
 * sends. In the browser each row plays a spinner and then its tick while the panel
 * is in view, and replays on the next visit. Reduced motion leaves it still.
 */
export function ChecksFigure({ loadActions = loadFromApi }: { loadActions?: LoadActions }) {
  const [ref, run] = useInView<HTMLDivElement>(0.4);
  const rows = useCheckRows(ref, loadActions);
  const [open, setOpen] = useState(false);
  const total = rows.length;
  const hidden = Math.max(0, total - SHOWN_ON_PHONE);
  return (
    <div ref={ref} className={PANEL} data-run={run || undefined}>
      <div className={HEADING}>
        <span>Checks</span>
        <span className="text-accent">
          {total} of {total} passed
        </span>
      </div>
      <ul className={LIST} aria-label={`The ${countWord(total)} actions in the repo, each passing`}>
        {rows.map((row, i) => (
          <li
            key={row.name}
            className={open || i < SHOWN_ON_PHONE ? ROW : `${ROW} max-[900px]:hidden`}
            style={cssVars({ '--i': i })}
          >
            <span className={ICON}>
              <Spinner />
              <Tick />
            </span>
            <span className={NAME}>
              <code className={ACTION}>
                <Breakable name={row.name} />
              </code>
              <span className={DOES}>{row.does}</span>
            </span>
            <span className={PASSED}>Passed</span>
          </li>
        ))}
      </ul>
      {hidden > 0 && !open ? (
        <button type="button" className={MORE} aria-expanded={false} onClick={() => setOpen(true)}>
          Show {hidden} more
        </button>
      ) : null}
      <p className={FOOTNOTE}>
        Each one is called as{' '}
        <code className={FOOTNOTE_CODE}>alcash55/ac-composite-actions/&lt;action&gt;</code>, at{' '}
        <code className={FOOTNOTE_CODE}>@main</code> or a pinned commit.
      </p>
    </div>
  );
}

/** A path that may wrap after each slash, so a long name never forces a sideways scroll. */
function Breakable({ name }: { name: string }) {
  return name.split('/').map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? '/' : null}
      {i > 0 ? <wbr /> : null}
      {part}
    </Fragment>
  ));
}

function Spinner() {
  return (
    <svg
      className={SPINNER}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M10 3a7 7 0 1 1-7 7" />
    </svg>
  );
}

function Tick() {
  return (
    <svg className={TICK} width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path
        d="M5.8 10.4l2.9 2.9 5.5-6"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
