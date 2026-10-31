import { useEffect, useRef, useState } from 'react';
import { useHydrated } from '~/components/shell/useHydrated';
import { prefersReducedMotion } from './hooks';
import './figures.css';

export interface ClipProps {
  src: string;
  poster: string;
  /** A sharper poster to swap in once it has loaded. */
  posterSwap?: string;
  /** What the recording shows, for people who cannot see it. */
  label: string;
  loop?: boolean;
  onEnded?: () => void;
  /** Raise this number to start the clip from the top, after loading a new `src` if it changed. */
  playRequest?: number;
}

type Choice = 'play' | 'pause' | null;

function start(video: HTMLVideoElement): void {
  // play() rejects when the browser blocks it. The poster stays, which is fine.
  video.play().catch(() => {});
}

/**
 * A silent clip with a play and pause button. It plays while at least 40% of it
 * is in view, unless the reader asked to pause it, and under reduced motion it
 * waits for them to press play. A clip that fails to load keeps its poster and
 * drops the button.
 */
export function Clip({ src, poster, posterSwap, label, loop = false, onEnded, playRequest = 0 }: ClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hydrated = useHydrated();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [swapped, setSwapped] = useState<string | null>(null);
  const choice = useRef<Choice>(null);
  const inView = useRef(false);
  const onEndedRef = useRef(onEnded);
  const loadedSrc = useRef(src);

  // A press is an explicit choice, and it outranks the in-view rule until pressed again.
  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      choice.current = 'pause';
      video.pause();
    } else {
      choice.current = 'play';
      start(video);
    }
  };

  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setPlaying(!video.paused);
    const fail = () => setFailed(true);
    const ended = () => onEndedRef.current?.();
    const update = () => {
      if (choice.current === 'pause' || !inView.current) {
        if (!video.paused) video.pause();
        return;
      }
      if ((choice.current === 'play' || !prefersReducedMotion()) && video.paused) start(video);
    };
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('ended', ended);
    // A bad <source> fires `error` on the source and it does not bubble, so listen while it passes down.
    video.addEventListener('error', fail, true);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          const last = entries.at(-1);
          if (!last) return;
          inView.current = last.isIntersecting;
          update();
        },
        { threshold: 0.4 },
      );
      observer.observe(video);
    }
    return () => {
      observer?.disconnect();
      video.removeEventListener('play', sync);
      video.removeEventListener('pause', sync);
      video.removeEventListener('ended', ended);
      video.removeEventListener('error', fail, true);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video && loadedSrc.current !== src) {
      loadedSrc.current = src;
      video.load();
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && playRequest > 0) start(video);
  }, [playRequest]);

  useEffect(() => {
    if (!posterSwap) return;
    const image = new Image();
    image.onload = () => setSwapped(posterSwap);
    image.src = posterSwap;
    return () => {
      image.onload = null;
    };
  }, [posterSwap]);

  const shownPoster = posterSwap && swapped === posterSwap ? posterSwap : poster;

  return (
    <div className="mbox">
      <video ref={videoRef} muted playsInline loop={loop} preload="metadata" poster={shownPoster} aria-label={label}>
        <source src={src} type="video/mp4" />
      </video>
      {hydrated && !failed ? (
        <button
          type="button"
          className="vctl"
          data-state={playing ? 'playing' : 'paused'}
          aria-label={playing ? 'Pause clip' : 'Play clip'}
          onClick={toggle}
        >
          <PlayIcon />
          <PauseIcon />
        </button>
      ) : null}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="i-play" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M5 3.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8A.8.8 0 0 0 5 3.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="i-pause" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
