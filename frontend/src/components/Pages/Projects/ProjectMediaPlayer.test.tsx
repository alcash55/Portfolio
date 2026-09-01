import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectClipToggle, ProjectMediaPlayer } from './ProjectMediaPlayer';
import { useProjectClip } from './useProjectClip';
import type { ProjectMedia } from './projectMedia';

/**
 * A stand-in for one entry of the real manifest, which is empty until the
 * clips are recorded. Everything here is shaped like the real thing: an
 * imported module URL, the existing `.webp` screenshot as the poster, and the
 * clip's intrinsic size.
 */
const fakeMedia: ProjectMedia = {
  src: '/assets/fake-demo-clip.mp4',
  poster: '/assets/fake-screenshot.webp',
  width: 1280,
  height: 720,
  caption: 'Little Town bingo board updating live',
};

const STILL = '/assets/fake-screenshot.webp';

/**
 * Composes the player exactly the way `ProjectCard` does: the media inside
 * what would be the card's button, the pause control as a *sibling* of it.
 * Testing the pieces separately would miss the thing that actually matters --
 * that hovering the card is what starts the clip.
 */
const CardHarness = ({ media }: { media?: ProjectMedia }) => {
  const [active, setActive] = useState(false);
  const clip = useProjectClip({ media, active });
  return (
    <div
      data-testid="card"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActive(false);
      }}
    >
      <ProjectMediaPlayer clip={clip} image={STILL} alt="a screenshot" aspectRatio="2 / 1" />
      <ProjectClipToggle clip={clip} active={active} projectName="Portfolio Website" />
    </div>
  );
};

/**
 * The dialog's usage: autoplay, looping, a custom pause control rather than
 * the browser's native `controls` (see ProjectDialog.tsx for why -- ~14 tab
 * stops per video was the bug).
 */
const DialogHarness = ({ media }: { media?: ProjectMedia }) => {
  const clip = useProjectClip({ media, autoPlay: true });
  return (
    <div data-testid="dialog-media" style={{ position: 'relative' }}>
      <ProjectMediaPlayer clip={clip} image={STILL} alt="a screenshot" aspectRatio="16 / 9" loop />
      <ProjectClipToggle clip={clip} active projectName="Portfolio Website" />
    </div>
  );
};

/**
 * jsdom implements no media pipeline at all -- `play()` and `pause()` throw
 * "Not implemented" through the virtual console. Stubbing them is what makes
 * "did it try to play?" an assertable question rather than noise on stderr.
 */
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();

const video = () => document.querySelector('video');

/** Forces `useMediaQuery('(prefers-reduced-motion: reduce)')` to a fixed answer. */
const stubReducedMotion = (reduce: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
};

beforeEach(() => {
  play.mockReset().mockResolvedValue(undefined);
  pause.mockReset();
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ProjectMediaPlayer', () => {
  describe('a project with no entry in the manifest', () => {
    it('renders the still image and never creates a video element, even on hover', async () => {
      const user = userEvent.setup();
      render(<CardHarness />);

      expect(screen.getByRole('img', { name: 'a screenshot' })).toHaveAttribute('src', STILL);
      expect(video(), 'a project with no clip must not put a <video> in the DOM').toBeNull();

      await user.hover(screen.getByTestId('card'));

      // The whole point of the missing-entry branch: the card behaves exactly
      // as it did before clips existed. No element, so no request, so no
      // bytes spent on a project that has no clip to spend them on.
      expect(video()).toBeNull();
      expect(play).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', { name: /preview/i }),
        'there is nothing to play, so there must be no play control',
      ).toBeNull();
    });
  });

  describe('a project with a clip', () => {
    it('shows the still until the card is hovered, then mounts the clip and plays it', async () => {
      const user = userEvent.setup();
      render(<CardHarness media={fakeMedia} />);

      // Lazy: the manifest entry exists, but nothing has asked for it yet.
      expect(video(), 'the clip must not be fetched before it is wanted').toBeNull();
      expect(screen.getByRole('img', { name: 'a screenshot' })).toBeInTheDocument();

      await user.hover(screen.getByTestId('card'));

      const element = video();
      expect(element, 'hovering the card should mount the clip').not.toBeNull();
      expect(element).toHaveAttribute('src', fakeMedia.src);
      // The poster is the screenshot the card was already showing, which is
      // what makes the still -> clip swap invisible.
      expect(element).toHaveAttribute('poster', fakeMedia.poster);
      expect(element).toHaveAttribute('preload', 'none');
      expect(
        element,
        'a card clip must not loop; it is a preview, not a background',
      ).not.toHaveAttribute('loop');
      expect((element as HTMLVideoElement).muted, 'autoplay is only allowed muted').toBe(true);
      expect(element).toHaveAttribute('playsinline');
      expect(element).toHaveAttribute('aria-label', fakeMedia.caption);
      await waitFor(() => expect(play).toHaveBeenCalled());
    });

    it('letterboxes the clip into exactly the box the still image used', async () => {
      // Card height is shared across a grid row, so a clip that changes the
      // media box's geometry drags four other cards with it. Both branches are
      // styled from one object, and emotion hashes a class per set of styles --
      // so an identical class name is proof the boxes are identical, and any
      // future "just for video" tweak breaks this test.
      const user = userEvent.setup();
      const { unmount } = render(<CardHarness />);
      const stillClass = screen.getByRole('img', { name: 'a screenshot' }).className;
      unmount();

      render(<CardHarness media={fakeMedia} />);
      await user.hover(screen.getByTestId('card'));

      expect(video()?.className, "the clip must render into the still image's box").toBe(
        stillClass,
      );
    });

    it('is pauseable from the keyboard, and stays paused while the pointer stays on the card', async () => {
      const user = userEvent.setup();
      render(<CardHarness media={fakeMedia} />);

      const card = screen.getByTestId('card');
      await user.hover(card);
      await waitFor(() => expect(play).toHaveBeenCalledTimes(1));

      // Activated by keyboard rather than `user.click`, for two reasons. It is
      // the path worth pinning -- an overlay control that only works with a
      // mouse is the failure this whole component is trying to avoid -- and
      // user-event's pointer model emits a spurious mouseleave/mouseenter pair
      // on the card when the pointer moves onto a child, which a real browser
      // does not. (Pointer-driven pause is verified in Chromium instead.)
      const toggle = screen.getByRole('button', { name: /^Pause the .* preview$/ });
      toggle.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(pause).toHaveBeenCalled());
      expect(
        screen.getByRole('button', { name: `Play the Portfolio Website preview` }),
        'the control has to say what it will do next, not what it just did',
      ).toBeInTheDocument();
      // Still hovered, so it must not quietly start itself again.
      expect(play).toHaveBeenCalledTimes(1);
      expect(video(), 'pausing must not unmount the clip').not.toBeNull();
    });

    it('stops and rewinds when the pointer leaves, so the next hover starts from the first frame', async () => {
      const user = userEvent.setup();
      render(<CardHarness media={fakeMedia} />);

      const card = screen.getByTestId('card');
      await user.hover(card);
      await waitFor(() => expect(play).toHaveBeenCalledTimes(1));

      const element = video() as HTMLVideoElement;
      element.currentTime = 4;
      await user.unhover(card);

      await waitFor(() => expect(pause).toHaveBeenCalled());
      expect(element.currentTime, 'leaving the card should rewind to the poster frame').toBe(0);

      // And a pause from the previous visit must not persist into this one.
      await user.hover(card);
      await waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    });

    it('plays on keyboard focus too, not only on hover', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button">before</button>
          <CardHarness media={fakeMedia} />
        </>,
      );

      await user.tab();
      expect(screen.getByRole('button', { name: 'before' })).toHaveFocus();
      // Focus moving into the card (its own action area in the real card, the
      // pause control here) is the keyboard equivalent of a hover.
      await user.tab();

      await waitFor(() => expect(play).toHaveBeenCalled());
    });

    it('falls back to the still image and logs once when the clip will not decode', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const user = userEvent.setup();
      render(<CardHarness media={fakeMedia} />);

      await user.hover(screen.getByTestId('card'));
      // `fireEvent` rather than a raw `dispatchEvent`: the handler sets state,
      // and an unwrapped update makes React log an act() warning -- which is a
      // second console.error, and this test counts them.
      fireEvent.error(video() as HTMLVideoElement);

      await waitFor(() => expect(video()).toBeNull());
      expect(
        screen.getByRole('img', { name: 'a screenshot' }),
        'a broken clip must leave the card showing its screenshot, not a black box',
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /preview/i }),
        'nothing left to play, so the control must go too',
      ).toBeNull();
      expect(
        consoleError,
        'exactly one console.error -- the smoke suite fails the build on any console error at load',
      ).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0][0]).toContain(fakeMedia.src);

      consoleError.mockRestore();
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    it('shows the poster image and never plays anything, clip or not', async () => {
      stubReducedMotion(true);
      const user = userEvent.setup();
      render(<CardHarness media={fakeMedia} />);

      expect(screen.getByRole('img', { name: 'a screenshot' })).toBeInTheDocument();

      await user.hover(screen.getByTestId('card'));

      expect(
        video(),
        'reduced motion means no video element at all -- a paused one still autoplays if anything ever calls play()',
      ).toBeNull();
      expect(play).not.toHaveBeenCalled();
      expect(
        screen.queryByRole('button', { name: /preview/i }),
        'no motion to control, so no control',
      ).toBeNull();
    });

    it('applies to the dialog as well, where the clip would otherwise autoplay', () => {
      stubReducedMotion(true);
      render(<DialogHarness media={fakeMedia} />);

      expect(video()).toBeNull();
      expect(play).not.toHaveBeenCalled();
      expect(screen.getByRole('img', { name: 'a screenshot' })).toBeInTheDocument();
    });
  });

  describe('the dialog variant', () => {
    it('autoplays the clip muted and looping, with a custom pause control instead of native controls', async () => {
      stubReducedMotion(false);
      render(<DialogHarness media={fakeMedia} />);

      const element = video() as HTMLVideoElement;
      expect(element, 'the dialog is where the visitor asked to see the clip').not.toBeNull();
      expect(element.muted).toBe(true);
      expect(element).toHaveAttribute('loop');
      // Native `controls` is what put ~14 extra tab stops (play, timeline,
      // volume, captions, fullscreen) between the dialog opening and the
      // GitHub/live-site links. WCAG 2.2.2 still has to be met -- it is, by
      // the single custom pause button below, which is exactly one tab stop.
      expect(element).not.toHaveAttribute('controls');
      await waitFor(() => expect(play).toHaveBeenCalled());

      const toggle = screen.getByRole('button', { name: /^Pause the .* preview$/ });
      toggle.focus();
      await userEvent.setup().keyboard('{Enter}');
      await waitFor(() => expect(pause).toHaveBeenCalled());
    });

    it('renders the screenshot when the project has no clip', () => {
      render(<DialogHarness />);

      expect(video()).toBeNull();
      expect(screen.getByRole('img', { name: 'a screenshot' })).toHaveAttribute('src', STILL);
    });
  });
});
