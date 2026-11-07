import { useHydrated } from '~/components/shell/useHydrated';
import { FOCUS_RING } from './figureStyles';
import { useClip } from './useClip';

// The window frame around a clip rounds and clips the corners, so the box needs no radius.
const BOX = 'relative grid aspect-2/1 place-items-center overflow-clip bg-wash';
const VIDEO = 'h-full w-full object-cover';
const BUTTON = [
  'absolute right-[12px] bottom-[12px] z-6 grid size-[44px] place-items-center',
  'cursor-pointer rounded-[50%] border-[1.5px] border-line-strong bg-surface text-ink',
  FOCUS_RING,
].join(' ');

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

/**
 * A silent clip with a play and pause button. `useClip` decides when it plays.
 * A clip that fails to load keeps its poster and drops the button.
 */
export function Clip({
  src,
  poster,
  posterSwap,
  label,
  loop = false,
  onEnded,
  playRequest = 0,
}: ClipProps) {
  const hydrated = useHydrated();
  const { videoRef, playing, failed, shownPoster, toggle } = useClip({
    src,
    poster,
    posterSwap,
    onEnded,
    playRequest,
  });

  return (
    <div className={BOX}>
      <video
        ref={videoRef}
        className={VIDEO}
        muted
        playsInline
        loop={loop}
        preload="metadata"
        poster={shownPoster}
        aria-label={label}
      >
        <source src={src} type="video/mp4" />
      </video>
      {hydrated && !failed ? (
        <button
          type="button"
          className={BUTTON}
          aria-label={playing ? 'Pause video' : 'Play video'}
          onClick={toggle}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      ) : null}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M5 3.2v11.6a.8.8 0 0 0 1.2.7l9-5.8a.8.8 0 0 0 0-1.4l-9-5.8A.8.8 0 0 0 5 3.2z"
        fill="currentColor"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="4" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
      <rect x="10.5" y="3" width="3.5" height="12" rx="1" fill="currentColor" />
    </svg>
  );
}
