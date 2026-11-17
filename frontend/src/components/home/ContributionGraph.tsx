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

const BLOCK = 'mt-[22px] max-w-[360px]';
const GRID = 'grid grid-flow-col grid-rows-7 gap-[3px]';
const CELL = 'aspect-square rounded-[2px]';
const SHADE = ['bg-fill-2', 'bg-accent/25', 'bg-accent/50', 'bg-accent/75', 'bg-accent'] as const;
// Not a numbered Fig, so a plain block. The class beats the prose column's paragraph defaults.
const CAPTION = 'mt-[8px] mb-0 text-[0.8125rem] text-ink-3';

const EMPTY_WEEKS: readonly ContributionWeek[] = Array.from({ length: SHOWN_WEEKS }, () => ({
  start: '',
  days: [0, 0, 0, 0, 0, 0, 0],
}));

type State = 'loading' | 'failed' | ContributionSummary;

/**
 * Six months of GitHub contributions, one square per day. The server sends a blank grid of the
 * same size and the browser fills it after hydration, so the answer moves nothing on the first
 * screen. An SSR fetch would hold the home page for as long as a cold API takes to wake. When
 * the API has no answer the graph leaves the page, because a blank grid reads as no activity.
 */
export function ContributionGraph({ load = loadFromApi }: { load?: LoadWeeks }) {
  const [state, setState] = useState<State>('loading');
  useEffect(() => {
    let live = true;
    void load().then((weeks) => {
      if (live) setState((weeks && summarize(weeks)) ?? 'failed');
    });
    return () => {
      live = false;
    };
  }, [load]);

  if (state === 'failed') return null;
  const loading = state === 'loading';
  const weeks = loading ? EMPTY_WEEKS : state.weeks;

  return (
    <div className={BLOCK} aria-busy={loading}>
      <div
        className={GRID}
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        aria-hidden="true"
        data-testid="contribution-grid"
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
      <p className={CAPTION}>
        {loading
          ? 'Loading GitHub activity'
          : `${state.total.toLocaleString('en-US')} contributions on GitHub since ${state.since}`}
      </p>
    </div>
  );
}
