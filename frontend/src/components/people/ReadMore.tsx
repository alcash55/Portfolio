import { useEffect, useRef, type KeyboardEvent } from 'react';

const WIDE = '(min-width: 900px)';

/**
 * Sizes an open panel to the figure beside it, so a long list covers the figure
 * and scrolls inside itself instead of making the chapter taller than the
 * viewport. Only runs on the two-column layout. On a narrow screen the panel
 * stays in the flow.
 */
function placePanel(details: HTMLDetailsElement, panel: HTMLElement) {
  panel.removeAttribute('style');
  if (!details.open || !window.matchMedia(WIDE).matches) return;
  const chapter = details.closest('section');
  const figure = chapter?.querySelector('figure');
  if (!chapter || !figure) return;

  const fig = figure.getBoundingClientRect();
  const box = chapter.getBoundingClientRect();
  // A reveal transform can turn the prose column into the containing block,
  // so measure where top:0 left:0 actually lands before offsetting from it.
  panel.style.cssText = `top:0;left:0;width:${fig.width}px`;
  const origin = panel.getBoundingClientRect();
  const needed = panel.scrollHeight + panel.offsetHeight - panel.clientHeight;
  const pad = parseFloat(getComputedStyle(chapter).paddingBottom) || 24;
  const lo = box.top + pad;
  const hi = box.bottom - pad;
  const height = Math.min(Math.ceil(Math.max(needed, fig.height)), hi - lo);
  const top = Math.max(lo, Math.min(fig.top, hi - height));
  panel.style.cssText = `top:${top - origin.top}px;left:${fig.left - origin.left}px;width:${fig.width}px;height:${height}px`;
}

export function ReadMore({ points, stack }: { points: readonly string[]; stack: string }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function place() {
    if (detailsRef.current && panelRef.current) placePanel(detailsRef.current, panelRef.current);
  }

  useEffect(() => {
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  function close() {
    if (detailsRef.current) detailsRef.current.open = false;
    summaryRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key !== 'Escape' || !detailsRef.current?.open) return;
    event.preventDefault();
    close();
  }

  return (
    <details className="pp-more" ref={detailsRef} onToggle={place} onKeyDown={onKeyDown}>
      <summary ref={summaryRef}>
        Read more
        <svg
          className="pp-chev"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="pp-more-b" ref={panelRef}>
        <button type="button" className="pp-more-x" aria-label="Close Read more" onClick={close}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3.5 3.5l9 9m0-9l-9 9"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <ul>
          {points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="pp-stack">{stack}</p>
      </div>
    </details>
  );
}
