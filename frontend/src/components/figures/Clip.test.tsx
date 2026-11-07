import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Clip } from './Clip';
import {
  stubIntersectionObserver,
  stubMedia,
  type MediaKit,
  type ObserverKit,
} from './figureTestKit';

let media: MediaKit;
let observer: ObserverKit;

beforeEach(() => {
  observer = stubIntersectionObserver();
  media = stubMedia();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const clip = (n: number) => (
  <Clip src={`/media/clip-${n}.mp4`} poster={`/media/clip-${n}.webp`} label={`Clip ${n}`} />
);

function videoOf(container: HTMLElement): HTMLVideoElement {
  const el = container.querySelector('video');
  if (!el) throw new Error('no video rendered');
  return el;
}

describe('Clip when the source changes', () => {
  it('offers the play button again after a failed clip is replaced', () => {
    const { container, rerender } = render(clip(1));
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();

    act(() => media.fail(videoOf(container)));
    expect(screen.queryByRole('button', { name: /video$/ })).not.toBeInTheDocument();

    rerender(clip(2));
    expect(screen.getByRole('button', { name: 'Play video' })).toBeInTheDocument();
  });

  it('forgets a pause the reader chose on the old clip', () => {
    const { container, rerender } = render(clip(1));
    const video = videoOf(container);
    act(() => observer.show(video));
    fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
    expect(video.paused).toBe(true);

    rerender(clip(2));
    act(() => observer.show(video));

    // A pause on one clip is not a pause on the next. It plays again once in view.
    expect(video.paused).toBe(false);
  });
});
