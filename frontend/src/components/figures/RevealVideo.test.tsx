import { act, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setReducedMotion, stubIntersectionObserver, stubMedia, type MediaKit, type ObserverKit } from './figureTestKit';
import { RevealVideo } from './RevealVideo';

const props = {
  name: 'Clipper',
  src: '/media/clipper-run.mp4',
  poster: '/media/clipper-run-poster.webp',
  label: 'Recording of the Clipper pipeline in a terminal',
  caption: 'One command, start to upload',
};

let io: ObserverKit;
let media: MediaKit;

beforeEach(() => {
  io = stubIntersectionObserver();
  media = stubMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function video(container: HTMLElement): HTMLVideoElement {
  const el = container.querySelector('video');
  if (!el) throw new Error('no video rendered');
  return el;
}

describe('RevealVideo markup', () => {
  it('frames a muted, looping clip with its poster and a caption', () => {
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    expect(screen.getByRole('group', { name: 'Clipper recording' })).toBeInTheDocument();
    expect(v).toHaveAttribute('poster', props.poster);
    expect(v).toHaveAttribute('aria-label', props.label);
    expect(v.muted).toBe(true);
    expect(v.loop).toBe(true);
    expect(v).toHaveAttribute('playsinline');
    expect(v).toHaveAttribute('preload', 'metadata');
    expect(v.querySelector('source')).toHaveAttribute('src', props.src);
    expect(v.querySelector('source')).toHaveAttribute('type', 'video/mp4');
    expect(screen.getByText(props.caption)).toBeInTheDocument();
  });

  it('keeps the window dots out of the accessibility tree', () => {
    const { container } = render(<RevealVideo {...props} />);
    expect(container.querySelector('.bar')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sends no play button in the server HTML, because it would do nothing without script', () => {
    const html = renderToStaticMarkup(<RevealVideo {...props} />);
    expect(html).toContain('poster="/media/clipper-run-poster.webp"');
    expect(html).not.toContain('<button');
  });
});

describe('RevealVideo playback', () => {
  it('offers a Play clip button once the page is live', () => {
    render(<RevealVideo {...props} />);
    expect(screen.getByRole('button', { name: 'Play clip' })).toBeInTheDocument();
  });

  it('starts playing when 40% is in view, and the button turns into Pause clip', () => {
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    expect(io.thresholds(v)).toEqual([0.4]);
    act(() => io.show(v, true));
    expect(media.calls).toEqual(['play']);
    expect(screen.getByRole('button', { name: 'Pause clip' })).toBeInTheDocument();
  });

  it('pauses when it scrolls out of view and plays again on return', () => {
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    act(() => io.show(v, true));
    act(() => io.show(v, false));
    expect(screen.getByRole('button', { name: 'Play clip' })).toBeInTheDocument();
    act(() => io.show(v, true));
    expect(media.calls).toEqual(['play', 'pause', 'play']);
  });

  it('respects a pause: scrolling back in does not restart it', () => {
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    act(() => io.show(v, true));
    fireEvent.click(screen.getByRole('button', { name: 'Pause clip' }));
    expect(screen.getByRole('button', { name: 'Play clip' })).toBeInTheDocument();
    act(() => io.show(v, false));
    act(() => io.show(v, true));
    expect(media.calls.filter((c) => c === 'play')).toHaveLength(1);
  });

  it('does not autoplay under reduced motion, but plays on request and then follows the view', () => {
    setReducedMotion(true);
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    act(() => io.show(v, true));
    expect(media.calls).toEqual([]);
    fireEvent.click(screen.getByRole('button', { name: 'Play clip' }));
    expect(media.calls).toEqual(['play']);
    act(() => io.show(v, false));
    act(() => io.show(v, true));
    expect(media.calls).toEqual(['play', 'pause', 'play']);
  });

  it('on a failed load keeps the poster and drops the button, with no message', () => {
    const { container } = render(<RevealVideo {...props} />);
    const v = video(container);
    act(() => media.fail(v));
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(v).toHaveAttribute('poster', props.poster);
  });

  it('stops watching when it unmounts', () => {
    const { container, unmount } = render(<RevealVideo {...props} />);
    const v = video(container);
    expect(io.watching(v)).toBe(1);
    unmount();
    expect(io.watching(v)).toBe(0);
  });
});

describe('RevealVideo poster swap', () => {
  it('shows the first poster, then swaps to the sharper one when it has loaded', () => {
    const loaders: Array<{ src: string; onload: (() => void) | null }> = [];
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        constructor() {
          loaders.push(this as { src: string; onload: (() => void) | null });
        }
        src = '';
      },
    );
    const { container } = render(<RevealVideo {...props} posterSwap="/media/clipper-run-hd.webp" />);
    const v = video(container);
    expect(v).toHaveAttribute('poster', props.poster);
    expect(loaders[0]?.src).toBe('/media/clipper-run-hd.webp');
    act(() => loaders[0]?.onload?.());
    expect(v).toHaveAttribute('poster', '/media/clipper-run-hd.webp');
  });
});
