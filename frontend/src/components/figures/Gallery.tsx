import { useState } from 'react';
import type { GallerySlide } from '~/content/projects';
import { Clip } from './Clip';
import { WindowFrame } from './WindowFrame';
import './figures.css';

interface GalleryProps {
  /** The page name, used in the group's accessible name. */
  name: string;
  slides: readonly [GallerySlide, ...GallerySlide[]];
}

/**
 * Gameplay clips in one window. Each plays once and the next follows, and the
 * last wraps to the first. With two or more clips a row of thumbnails picks one.
 * The caption is a live region so a screen reader hears each change.
 */
export function Gallery({ name, slides }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [playRequest, setPlayRequest] = useState(0);
  const current = slides[index] ?? slides[0];

  const show = (next: number) => {
    setIndex(next);
    setPlayRequest((n) => n + 1);
  };

  return (
    <figure className="mfig gal" role="group" aria-label={`${name} gameplay clips`}>
      <WindowFrame>
        <Clip
          src={current.src}
          poster={current.poster}
          label={current.label}
          playRequest={playRequest}
          onEnded={() => show((index + 1) % slides.length)}
        />
      </WindowFrame>
      <figcaption className="mcap" aria-live="polite">
        <strong>{current.caption}</strong>
        <span>{current.description}</span>
      </figcaption>
      {slides.length > 1 ? (
        <ul className="gthumbs">
          {slides.map((slide, i) => (
            <li key={slide.src}>
              <button
                type="button"
                className="gth"
                aria-pressed={i === index}
                onClick={() => show(i)}
              >
                <img src={slide.poster} alt="" loading="lazy" />
                <span>{slide.caption}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
