import { useState } from 'react';
import type { GallerySlide } from '~/content/projects';
import { Clip } from './Clip';
import { CAPTION_ROW, CAPTION_TEXT, CAPTION_TITLE, FOCUS_RING } from './figureStyles';
import { WindowFrame } from './WindowFrame';

// The black behind a clip shows while it loads. It belongs to the gallery, not to Clip, so the
// descendant rule keeps Clip free of it. :where() holds its specificity at one element.
// `relative` keeps the screen-reader-only caption, which is absolutely positioned, inside the figure.
const FIGURE = 'relative [:where(&)_video]:bg-black';

const THUMBS = 'mt-[16px] grid grid-cols-2 gap-[12px] min-[700px]:grid-cols-4';
// The picked thumbnail has an accent edge and a 1px accent line outside it, and the pointer does
// not change that. While it has the keyboard ring, the ring takes the place of the line.
const THUMB = [
  'grid w-full cursor-pointer gap-[8px] rounded-[16px] border-[1.5px] border-line bg-surface p-[6px]',
  'text-start text-[0.9375rem] leading-[1.2] font-medium text-ink',
  'not-aria-pressed:hover:border-line-strong',
  'aria-pressed:border-accent not-focus-visible:aria-pressed:shadow-[0_0_0_1px_var(--accent)]',
  FOCUS_RING,
].join(' ');
const THUMB_IMAGE = 'aspect-2/1 w-full rounded-[10px] object-cover';
const THUMB_LABEL = 'px-[4px] pb-[4px]';

interface GalleryProps {
  /** The page name, used in the group's accessible name. */
  name: string;
  slides: readonly [GallerySlide, ...GallerySlide[]];
  /** True inside a Fig frame. The clip caption then stays for screen readers and prints no row. */
  framed?: boolean;
}

/**
 * Gameplay clips in one window. Each plays once and the next follows, and the
 * last wraps to the first. With two or more clips a row of thumbnails picks one.
 * The caption is a live region so a screen reader hears each change.
 */
export function Gallery({ name, slides, framed = false }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [playRequest, setPlayRequest] = useState(0);
  const current = slides[index] ?? slides[0];

  const show = (next: number) => {
    setIndex(next);
    setPlayRequest((n) => n + 1);
  };

  return (
    <figure className={FIGURE} aria-label={`${name} gameplay clips`}>
      <WindowFrame bare={framed}>
        <Clip
          src={current.src}
          poster={current.poster}
          label={current.label}
          playRequest={playRequest}
          onEnded={() => show((index + 1) % slides.length)}
        />
      </WindowFrame>
      <figcaption className={framed ? 'sr' : CAPTION_ROW} aria-live="polite">
        <strong className={CAPTION_TITLE}>{current.caption}</strong>
        <span className={CAPTION_TEXT}>{current.description}</span>
      </figcaption>
      {slides.length > 1 ? (
        <ul className={THUMBS}>
          {slides.map((slide, i) => (
            <li key={slide.src}>
              <button
                type="button"
                className={THUMB}
                aria-pressed={i === index}
                onClick={() => show(i)}
              >
                <img className={THUMB_IMAGE} src={slide.poster} alt="" loading="lazy" />
                <span className={THUMB_LABEL}>{slide.caption}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
