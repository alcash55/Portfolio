import { useEffect, useState } from 'react';
import { apiUrl } from '~/lib/apiUrl';
import {
  fetchContributions,
  level,
  SHOWN_WEEKS,
  summarize,
  type ContributionSummary,
  type ContributionWeek,
} from '~/lib/contributions';

type LoadWeeks = () => Promise<readonly ContributionWeek[] | null>;

const loadFromApi: LoadWeeks = () =>
  // Wrapped so the call keeps `window` as its receiver.
  fetchContributions({ fetch: (input, init) => fetch(input, init), apiUrl: apiUrl() });

// A cold Render API wakes in about 12 seconds. After this long the caption says so.
const SLOW_AFTER_MS = 4_000;

const BLOCK = 'mt-[22px] max-w-[360px]';
// The sweep is a highlight that crosses the grid while it loads. It lives on ::after, so the
// cells never move, and it only runs when motion is allowed.
const GRID =
  'relative grid grid-flow-col grid-rows-7 gap-[3px] overflow-hidden rounded-[2px] ' +
  'data-[state=loading]:motion-safe:after:animate-gh-sweep ' +
  'data-[state=loading]:after:absolute data-[state=loading]:after:inset-0 ' +
  'data-[state=loading]:after:-translate-x-full ' +
  'data-[state=loading]:after:bg-linear-to-r data-[state=loading]:after:from-transparent ' +
  'data-[state=loading]:after:via-ink/10 data-[state=loading]:after:to-transparent ' +
  'data-[state=failed]:opacity-40';
const CELL = 'aspect-square rounded-[2px]';
const SHADE = ['bg-fill-2', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent'] as const;
// Not a numbered Fig, so a plain block. The class beats the prose column's paragraph defaults.
const CAPTION = 'mt-[8px] mb-0 text-[0.8125rem] text-ink-3';
const RETRY =
  'ml-[6px] cursor-pointer rounded-[2px] bg-transparent p-0 text-[0.8125rem] text-accent underline ' +
  'underline-offset-2 hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-accent';

const EMPTY_WEEKS: readonly ContributionWeek[] = Array.from({ length: SHOWN_WEEKS }, () => ({
  start: '',
  days: [0, 0, 0, 0, 0, 0, 0],
}));

type State = 'loading' | 'failed' | ContributionSummary;

/**
 * Six months of GitHub contributions, one square per day. The server sends a blank grid of the
 * same size and the browser fills it after hydration, so the answer moves nothing on the first
 * screen. An SSR fetch would hold the home page for as long as a cold API takes to wake. While it
 * waits the grid shimmers, and after a few seconds the caption says the API is waking up. When the
 * API has no answer the grid stays, dimmed, with a retry. It never leaves the page, because a
 * graph that vanishes reads as a bug, and a bright blank grid reads as no activity.
 */
export function ContributionGraph({ load = loadFromApi }: { load?: LoadWeeks }) {
  const [state, setState] = useState<State>('loading');
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    void load().then((weeks) => {
      if (!live) return;
      clearTimeout(timer);
      setState((weeks && summarize(weeks)) ?? 'failed');
    });
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [load, attempt]);

  const retry = () => {
    setSlow(false);
    setState('loading');
    setAttempt((n) => n + 1);
  };

  const done = state !== 'loading' && state !== 'failed';
  const weeks = done ? state.weeks : EMPTY_WEEKS;
  const phase = done ? 'ready' : state;

  return (
    <div className={BLOCK} aria-busy={state === 'loading'}>
      <div
        className={GRID}
        style={{ gridTemplateColumns: `repeat(${SHOWN_WEEKS}, minmax(0, 1fr))` }}
        aria-hidden="true"
        data-testid="contribution-grid"
        data-state={phase}
      >
        {weeks.flatMap((week, w) =>
          Array.from({ length: 7 }, (_, d) => {
            const count = week.days[d];
            // A short week leaves its missing days blank: the year starts or ends mid-week.
            if (count === undefined) return <span key={`${w}-${d}`} />;
            return (
              <span
                key={`${w}-${d}`}
                className={`${CELL} ${SHADE[level(count)]}`}
                data-level={level(count)}
              />
            );
          }),
        )}
      </div>
      <p className={CAPTION} aria-live="polite">
        {done ? (
          `${state.total.toLocaleString('en-US')} contributions on GitHub since ${state.since}`
        ) : state === 'failed' ? (
          <>
            GitHub activity did not load.
            <button type="button" className={RETRY} onClick={retry}>
              Try again
            </button>
          </>
        ) : slow ? (
          'Still loading, the API is waking up'
        ) : (
          'Loading GitHub activity'
        )}
      </p>
    </div>
  );
}
