import type { ReactNode } from 'react';
import type { Photo } from '~/content/people';
import { Fig } from '~/components/home/Fig';
import { usePhotoCarousel } from './usePhotoCarousel';

export interface PhotoCarouselProps {
  /** Numbered frame the carousel sits in. */
  fig: { n: number; label: string };
  /** Accessible name of the carousel region. */
  label: string;
  photos: readonly Photo[];
  /** What the slides are, for the button names. */
  noun?: string;
  /**
   * How a slide holds its image. `frame` fits it inside a 4:3 box, so photos of any shape line up.
   * `natural` lets the image set its own height, so nothing crops and no bands show around it.
   */
  fit?: Fit;
}

type Fit = 'frame' | 'natural';

// No autoplay: buttons, arrow keys and swipe move one strip. The scrollbar is hidden because the
// buttons and the count replace it. The focus ring sits inside the strip, where the figure frame
// would otherwise clip it.
const TRACK = [
  'flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain',
  '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
  'focus-visible:-outline-offset-3',
].join(' ');

const SLIDE = 'shrink-0 basis-full snap-center';

const BOX: Record<Fit, string> = {
  // One fixed grid track, so a portrait photo scales down into the 4:3 box. With an auto track its
  // natural height would stretch the box, and every slide in the row with it.
  frame: [
    'grid aspect-4/3 min-h-0 place-items-center bg-band p-2',
    'grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]',
  ].join(' '),
  natural: 'bg-band',
};

// The image classes also undo the 2:1 crop that the figure frame puts on every image.
const IMAGE: Record<Fit, string> = {
  frame: 'aspect-auto h-auto max-h-full w-auto max-w-full object-contain',
  natural: 'aspect-auto h-auto w-full object-contain',
};

const CAPTION = 'px-[1.1rem] pt-3 text-[0.9375rem] text-ink-2';

const BUTTON = [
  'grid size-11 place-items-center rounded-[50%]',
  'border-[1.5px] border-line-strong bg-surface text-ink',
].join(' ');
const BUTTON_ENABLED = 'cursor-pointer hover:bg-fill';
// Dimmed and not clickable, but still focusable, so it stays in the tab order.
const BUTTON_DISABLED = 'cursor-default opacity-40';

/** A numbered figure holding the strip. The count and buttons sit in its caption. */
export function PhotoCarousel({
  fig,
  label,
  photos,
  noun = 'photo',
  fit = 'frame',
}: PhotoCarouselProps) {
  const { trackRef, current, last, interactive, goTo, onScroll, onKeyDown } = usePhotoCarousel(
    photos.length,
  );

  return (
    <Fig
      n={fig.n}
      label={fig.label}
      caption={
        <span role="status" aria-live="polite">
          {current + 1} of {photos.length}
        </span>
      }
      meta={
        interactive ? (
          <span className="flex items-center gap-[8px]">
            <CarButton
              label={`Previous ${noun}`}
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
            >
              <path d="M11 3L5 9l6 6" />
            </CarButton>
            <CarButton
              label={`Next ${noun}`}
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
        className={TRACK}
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
            className={SLIDE}
            key={photo.src}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${photos.length}`}
          >
            <div className={BOX[fit]}>
              <img
                className={IMAGE[fit]}
                src={photo.src}
                width={photo.width}
                height={photo.height}
                loading="lazy"
                alt={photo.alt}
              />
            </div>
            <p className={CAPTION}>{photo.caption}</p>
          </div>
        ))}
      </div>
    </Fig>
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
      className={`${BUTTON} ${disabled ? BUTTON_DISABLED : BUTTON_ENABLED}`}
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
