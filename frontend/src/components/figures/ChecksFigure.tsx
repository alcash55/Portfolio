import { Fragment } from 'react';
import { CHECK_ROWS } from '~/content/checks';
import { cssVars, useInView } from './hooks';
import './figures.css';

/**
 * A pull request checks panel with every row passed. That is the state the server
 * sends. In the browser each row plays a spinner and then its tick while the panel
 * is in view, and replays on the next visit. Reduced motion leaves it still.
 */
export function ChecksFigure() {
  const [ref, run] = useInView<HTMLDivElement>(0.4);
  const total = CHECK_ROWS.length;
  return (
    <div ref={ref} className={run ? 'checks run' : 'checks'}>
      <div className="ck-h">
        <span>Checks</span>
        <span>
          {total} of {total} passed
        </span>
      </div>
      <ul className="ck-list" aria-label="The nine actions in the repo, each passing">
        {CHECK_ROWS.map((row, i) => (
          <li key={row.name} className="ck-row" style={cssVars({ '--i': i })}>
            <span className="ico">
              <Spinner />
              <Tick />
            </span>
            <span className="nm">
              <code>
                <Breakable name={row.name} />
              </code>
              <span className="ds">{row.does}</span>
            </span>
            <span className="st">Passed</span>
          </li>
        ))}
      </ul>
      <p className="ck-f">
        Each one is called as <code>alcash55/ac-composite-actions/&lt;action&gt;</code>, at{' '}
        <code>@main</code> or a pinned commit.
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
      className="spin"
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
    <svg className="tick" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
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
