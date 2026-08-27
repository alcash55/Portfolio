import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ANALYTICS_EVENTS } from './useAnalytics';

/**
 * The spies every test in this file asserts against. `posthog-js` is mocked
 * rather than a real client being started, because a real one would open a
 * socket to the ingest host from the unit suite -- and the point of these
 * tests is the wiring, not PostHog's SDK.
 *
 * Mocking the module also stands in for the dynamic `import('posthog-js')`
 * inside `loadAnalytics`: Vitest resolves the mock through the same module
 * registry, so the await still has to work for any of this to pass.
 */
const capture = vi.fn();
const init = vi.fn();
vi.mock('posthog-js', () => ({
  posthog: { init, capture },
}));

beforeEach(() => {
  capture.mockClear();
  init.mockClear();
  vi.resetModules();
});

/**
 * Loads `useAnalytics` fresh with the token present or absent.
 *
 * `analyticsEnabled` and the SDK-load singleton are both module scope (Vite
 * inlines `import.meta.env` at build time, so the token cannot change while
 * the app runs) -- which means the only honest way to test the disabled path
 * is to re-import the module with a different env, not to reassign a value it
 * already captured. `vi.resetModules()` in `beforeEach` is what makes each
 * import a genuinely fresh one rather than a cache hit carrying the previous
 * test's loaded client.
 */
const loadWithToken = async (token: string | undefined) => {
  vi.stubEnv('VITE_POSTHOG_PROJECT_TOKEN', token ?? '');
  return import('./useAnalytics');
};

describe('useAnalytics', () => {
  it('captures the event and its properties when a project token is configured', async () => {
    const { useAnalytics } = await loadWithToken('phc_test_token');

    const Probe = () => {
      const send = useAnalytics();
      return (
        <button onClick={() => send(ANALYTICS_EVENTS.RESUME_CLICKED, { location: 'about' })}>
          go
        </button>
      );
    };

    render(<Probe />);
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    // The capture is queued behind the SDK's dynamic import, so it lands a
    // microtask later than the click rather than synchronously with it.
    await vi.waitFor(() => expect(capture).toHaveBeenCalledTimes(1));

    expect(capture).toHaveBeenCalledWith('resume_clicked', { location: 'about' });
  });

  it('captures nothing at all when no token is configured', async () => {
    // The case that covers a fresh clone, CI, and the e2e build (which is
    // deliberately built with an empty token -- see playwright.config.ts).
    // With no token the SDK is never even fetched, so this asserts both that
    // no event is sent and that nothing was loaded to send it with.
    const { useAnalytics } = await loadWithToken(undefined);

    const Probe = () => {
      const send = useAnalytics();
      return <button onClick={() => send(ANALYTICS_EVENTS.CONTACT_SUBMITTED)}>go</button>;
    };

    render(<Probe />);
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(capture).not.toHaveBeenCalled();
    expect(init).not.toHaveBeenCalled();
  });

  it('initialises the SDK exactly once no matter how many components capture', async () => {
    // `loadAnalytics` memoises its own promise. Without that, every call site
    // would re-run `posthog.init()` -- which resets the SDK's state mid-session
    // and would quietly fragment one visitor into several.
    const { useAnalytics, loadAnalytics } = await loadWithToken('phc_test_token');

    const Probe = () => {
      const send = useAnalytics();
      return <button onClick={() => send(ANALYTICS_EVENTS.PROJECT_OPENED)}>go</button>;
    };

    render(
      <>
        <Probe />
        <Probe />
      </>,
    );
    const buttons = screen.getAllByRole('button', { name: 'go' });
    await userEvent.click(buttons[0]);
    await userEvent.click(buttons[1]);
    await loadAnalytics();

    await vi.waitFor(() => expect(capture).toHaveBeenCalledTimes(2));
    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith('phc_test_token', expect.objectContaining({}));
  });

  it('gives every event a distinct name, so two of them cannot silently merge', () => {
    // A duplicated value here would not fail anywhere else: both call sites
    // would keep working and their counts would quietly add together, which is
    // the kind of measurement bug you only notice months later.
    const names = Object.values(ANALYTICS_EVENTS);
    expect(new Set(names).size, `duplicate event name in ${names.join(', ')}`).toBe(names.length);
  });

  it('names events in snake_case, matching what PostHog groups on', () => {
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name, `"${name}" is not snake_case`).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
    }
  });
});
