import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { Photo } from '~/content/people';
import { PeopleFig } from './PeopleChapter';

const subscribeNever = () => () => undefined;

/** The strip settles after a swipe. The count updates once the scroll stops. */
const SETTLE_MS = 60;

export interface PhotoCarouselProps {
  /** Numbered frame the carousel sits in. */
  fig: { n: number; label: string };
  /** Accessible name of the carousel region. */
  label: string;
  photos: readonly Photo[];
}

/** A numbered figure holding the strip. The count and buttons sit in its caption. */
export function PhotoCarousel({ fig, label, photos }: PhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  // Buttons need script to work, so the server HTML and the first client render
  // leave them out and hydration adds them.
  const interactive = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const last = photos.length - 1;

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  function syncFromScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setCurrent(Math.max(0, Math.min(last, index)));
  }

  function onScroll() {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(syncFromScroll, SETTLE_MS);
  }

  function goTo(target: number) {
    const track = trackRef.current;
    const index = Math.max(0, Math.min(last, target));
    if (!track) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A jump of more than one photo snaps. Smooth scrolling across several
    // slides would flash each of them past.
    const behavior = reduced || Math.abs(index - current) > 1 ? 'auto' : 'smooth';
    track.scrollTo({ left: index * track.clientWidth, behavior });
    setCurrent(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowRight':
        goTo(current + 1);
        break;
      case 'ArrowLeft':
        goTo(current - 1);
        break;
      case 'Home':
        goTo(0);
        break;
      case 'End':
        goTo(last);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <PeopleFig
      n={fig.n}
      label={fig.label}
      caption={
        <span className="pp-car-st" role="status" aria-live="polite">
          {current + 1} of {photos.length}
        </span>
      }
      meta={
        interactive ? (
          <span className="pp-car-ctl">
            <CarButton
              label="Previous photo"
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
            >
              <path d="M11 3L5 9l6 6" />
            </CarButton>
            <CarButton
              label="Next photo"
              disabled={current === last}
              onClick={() => goTo(current + 1)}
            >
              <path d="M7 3l6 6-6 6" />
            </CarButton>
          </span>
        ) : null
      }
    >
      {/* The region is the scroller and the tab stop, so keyboard users can reach
          the strip and axe accepts it as a scrollable region with focus. */}
      <div
        className="pp-car"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        ref={trackRef}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
      >
        {photos.map((photo, i) => (
          <div
            className="pp-slide"
            key={photo.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}`}
          >
            <div className="pp-box">
              <img
                src={photo.src}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                alt={photo.alt}
              />
            </div>
            <p>{photo.caption}</p>
          </div>
        ))}
      </div>
    </PeopleFig>
  );
}

function CarButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="pp-car-btn"
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
