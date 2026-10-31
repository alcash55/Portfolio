import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DETAILS, type GallerySlide } from '~/content/projects';
import { stubIntersectionObserver, stubMedia, type MediaKit } from './figureTestKit';
import { Gallery } from './Gallery';

const slide = (n: number): GallerySlide => ({
  src: `/media/clip-${n}.mp4`,
  poster: `/media/clip-${n}-poster.webp`,
  caption: `Clip ${n}`,
  description: `What clip ${n} shows.`,
  label: `Recording of clip ${n}`,
});
const three: [GallerySlide, ...GallerySlide[]] = [slide(1), slide(2), slide(3)];

let media: MediaKit;

beforeEach(() => {
  stubIntersectionObserver();
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

describe('Gallery', () => {
  it('opens on the first clip, with its caption in a polite live region', () => {
    const { container } = render(<Gallery name="Golem Miners" slides={three} />);
    expect(screen.getByRole('group', { name: 'Golem Miners gameplay clips' })).toBeInTheDocument();
    const v = video(container);
    expect(v).toHaveAttribute('aria-label', 'Recording of clip 1');
    expect(v).toHaveAttribute('poster', '/media/clip-1-poster.webp');
    expect(v.loop).toBe(false);
    const caption = screen.getByText('Clip 1', { selector: 'strong' }).closest('figcaption');
    expect(caption).toHaveAttribute('aria-live', 'polite');
    expect(caption).toHaveTextContent('What clip 1 shows.');
  });

  it('lists a thumbnail button per clip, the first one pressed', () => {
    render(<Gallery name="Golem Miners" slides={three} />);
    const thumbs = screen.getAllByRole('button', { name: /^Clip \d$/ });
    expect(thumbs.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    for (const thumb of thumbs)
      expect(within(thumb).getByRole('presentation')).toHaveAttribute('alt', '');
  });

  it('shows no thumbnails for a single clip', () => {
    const golem = DETAILS['golem-miners'].media;
    if (golem.kind !== 'gallery') throw new Error('Golem Miners should have a gallery');
    render(<Gallery name="Golem Miners" slides={golem.slides} />);
    expect(screen.queryByRole('button', { name: 'Camp' })).toBeNull();
    expect(screen.getByText('Camp')).toBeInTheDocument();
  });

  it('plays the clip a thumbnail points at, and moves the caption and pressed state with it', () => {
    const { container } = render(<Gallery name="Golem Miners" slides={three} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clip 3' }));
    const v = video(container);
    expect(v.querySelector('source')).toHaveAttribute('src', '/media/clip-3.mp4');
    expect(v).toHaveAttribute('poster', '/media/clip-3-poster.webp');
    expect(v).toHaveAttribute('aria-label', 'Recording of clip 3');
    expect(screen.getByText('What clip 3 shows.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clip 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Clip 1' })).toHaveAttribute('aria-pressed', 'false');
    expect(media.calls).toEqual(['load', 'play']);
  });

  it('moves to the next clip when one ends, and wraps from the last to the first', () => {
    const { container } = render(<Gallery name="Golem Miners" slides={three} />);
    const v = video(container);
    act(() => media.end(v));
    expect(screen.getByRole('button', { name: 'Clip 2' })).toHaveAttribute('aria-pressed', 'true');
    act(() => media.end(v));
    act(() => media.end(v));
    expect(screen.getByRole('button', { name: 'Clip 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(video(container).querySelector('source')).toHaveAttribute('src', '/media/clip-1.mp4');
  });

  it('plays a lone clip again when it ends', () => {
    const golem = DETAILS['golem-miners'].media;
    if (golem.kind !== 'gallery') throw new Error('Golem Miners should have a gallery');
    const { container } = render(<Gallery name="Golem Miners" slides={golem.slides} />);
    act(() => media.end(video(container)));
    expect(media.calls).toEqual(['play']);
  });
});
