import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Photo } from '~/content/people';
import { PeopleFig } from './PeopleChapter';

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
  const trackRef = useRef<HTMLUListElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  // Buttons need script to work, so they render only once it has run.
  const [interactive, setInteractive] = useState(false);
  const last = photos.length - 1;

  useEffect(() => {
    setInteractive(true);
    return () => clearTimeout(settleTimer.current);
  }, []);

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
      <div
        className="pp-car"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <ul className="pp-car-track" ref={trackRef} onScroll={onScroll}>
          {photos.map((photo, i) => (
            <li
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
            </li>
          ))}
        </ul>
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
      disabled={disabled}
      onClick={onClick}
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
