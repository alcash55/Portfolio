import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './hooks';

export interface UseClipOptions {
  src: string;
  poster: string;
  /** A sharper poster to swap in once it has loaded. */
  posterSwap?: string;
  onEnded?: () => void;
  /** Raise this number to start the clip from the top, after loading a new `src` if it changed. */
  playRequest: number;
}

type Choice = 'play' | 'pause' | null;

function start(video: HTMLVideoElement): void {
  // play() rejects when the browser blocks it. The poster stays, which is fine.
  video.play().catch(() => {});
}

/**
 * Playback rules for a silent clip. It plays while at least 40% of it is in view,
 * unless the reader asked to pause it, and under reduced motion it waits for them
 * to press play. A clip that fails to load keeps its poster and reports `failed`.
 */
export function useClip({ src, poster, posterSwap, onEnded, playRequest }: UseClipOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // Keyed by source, so a clip that replaces a broken one starts with its button back.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
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
    const fail = () => setFailedSrc(loadedSrc.current);
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
      // A pause the reader chose belongs to the old clip.
      choice.current = null;
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

  return {
    videoRef,
    playing,
    failed: failedSrc === src,
    shownPoster: posterSwap && swapped === posterSwap ? posterSwap : poster,
    toggle,
  };
}
