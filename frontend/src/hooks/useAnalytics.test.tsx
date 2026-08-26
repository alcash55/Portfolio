import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ANALYTICS_EVENTS } from './useAnalytics';

/**
 * The capture spy every test in this file asserts against. `usePostHog` is
 * mocked rather than a real PostHog client being started, because a real one
 * would open a socket to the ingest host from the unit suite -- and the whole
 * point of these tests is the wiring, not PostHog's SDK.
 */
const capture = vi.fn();
vi.mock('@posthog/react', () => ({
  usePostHog: () => ({ capture }),
}));

beforeEach(() => {
  capture.mockClear();
  vi.resetModules();
});

/**
 * Loads `useAnalytics` fresh with the token present or absent.
 *
 * `analyticsEnabled` is read at module scope (Vite inlines `import.meta.env`
 * at build time, so it cannot change while the app runs) -- which means the
 * only honest way to test the disabled path is to re-import the module with a
 * different env, not to reassign a value it already captured.
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

    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('resume_clicked', { location: 'about' });
  });

  it('captures nothing at all when no token is configured', async () => {
    // The case that covers a fresh clone, CI, and the e2e build (which is
    // deliberately built with an empty token -- see playwright.config.ts).
    // `usePostHog()` outside a provider returns a *default, uninitialised*
    // client rather than undefined, so an unguarded call would not crash; it
    // would quietly log "you must init PostHog first" on every single event.
    // This asserts the call never happens, not that it fails politely.
    const { useAnalytics } = await loadWithToken(undefined);

    const Probe = () => {
      const send = useAnalytics();
      return <button onClick={() => send(ANALYTICS_EVENTS.CONTACT_SUBMITTED)}>go</button>;
    };

    render(<Probe />);
    await userEvent.click(screen.getByRole('button', { name: 'go' }));

    expect(capture).not.toHaveBeenCalled();
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
