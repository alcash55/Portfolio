import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYTICS_EVENTS,
  createAnalytics,
  addIngestPreconnect,
  privacyOptOut,
  readAnalyticsConfig,
  type AnalyticsDeps,
  type SdkClient,
} from './analytics';

/** A stand-in for the SDK. The unit suite never opens a socket to an ingest host. */
function fakeSdk() {
  const sdk = { init: vi.fn(), capture: vi.fn() } satisfies SdkClient;
  return sdk;
}

/** Idle callbacks wait in a list until the test runs them, like a busy main thread. */
function setup(overrides: Partial<AnalyticsDeps> = {}) {
  const sdk = fakeSdk();
  const idle: Array<() => void> = [];
  const loadSdk = vi.fn(() => Promise.resolve(sdk));
  const deps: AnalyticsDeps = {
    token: 'phc_testtoken',
    host: 'https://us.i.posthog.com',
    loadSdk,
    whenIdle: (run) => idle.push(run),
    optedOut: () => false,
    ...overrides,
  };
  const analytics = createAnalytics(deps);
  const runIdle = async () => {
    idle.splice(0).forEach((run) => run());
    // One macrotask lets the SDK promise settle and the queue flush.
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { analytics, sdk, loadSdk, runIdle, idle };
}

describe('with no token', () => {
  it('is disabled, never schedules a load and never captures', async () => {
    const { analytics, sdk, loadSdk, idle, runIdle } = setup({ token: undefined });

    analytics.start();
    analytics.capture('resume_clicked', { location: 'about' });
    analytics.pageview('https://example.test/');
    await runIdle();

    expect(analytics.enabled).toBe(false);
    expect(idle).toHaveLength(0);
    expect(loadSdk).not.toHaveBeenCalled();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
  });
});

describe('with a token', () => {
  it('waits for an idle moment before it downloads the SDK', async () => {
    const { analytics, loadSdk, idle, runIdle } = setup();

    analytics.start();
    expect(idle).toHaveLength(1);
    expect(loadSdk).not.toHaveBeenCalled();

    await runIdle();
    expect(loadSdk).toHaveBeenCalledTimes(1);
  });

  it('starts the SDK once, with the ingest host and the privacy defaults', async () => {
    const { analytics, sdk, runIdle } = setup();

    analytics.start();
    analytics.start();
    await runIdle();

    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith(
      'phc_testtoken',
      expect.objectContaining({
        api_host: 'https://us.i.posthog.com',
        // Cookieless: nothing is stored on the visitor's device.
        persistence: 'memory',
        person_profiles: 'identified_only',
        // The three named events and the pageview are the whole vocabulary.
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
      }),
    );
  });

  it('keeps session recording and other extras off', async () => {
    const { analytics, sdk, runIdle } = setup();
    analytics.start();
    await runIdle();
    const config = sdk.init.mock.calls[0]?.[1];
    expect(config).toMatchObject({
      disable_session_recording: true,
      disable_surveys: true,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_exceptions: false,
      advanced_disable_flags: true,
    });
  });

  it('queues events fired before the SDK loads and sends them in order afterwards', async () => {
    const { analytics, sdk, runIdle } = setup();

    analytics.start();
    analytics.pageview('https://example.test/');
    analytics.capture('project_opened', { project: 'clipper' });
    expect(sdk.capture).not.toHaveBeenCalled();

    await runIdle();

    expect(sdk.capture.mock.calls).toEqual([
      ['$pageview', { $current_url: 'https://example.test/' }],
      ['project_opened', { project: 'clipper' }],
    ]);
  });

  it('sends events straight through once the SDK is ready', async () => {
    const { analytics, sdk, runIdle } = setup();
    analytics.start();
    await runIdle();

    analytics.capture('contact_submitted');

    expect(sdk.capture).toHaveBeenCalledWith('contact_submitted', undefined);
  });

  it('sends the url the pageview was taken at, not the url at flush time', async () => {
    const { analytics, sdk, runIdle } = setup();
    analytics.start();
    analytics.pageview('https://example.test/a');
    analytics.pageview('https://example.test/b');
    await runIdle();

    expect(sdk.capture.mock.calls.map((call) => call[1])).toEqual([
      { $current_url: 'https://example.test/a' },
      { $current_url: 'https://example.test/b' },
    ]);
  });

  it('drops events instead of growing without bound when the SDK never loads', () => {
    const { analytics, sdk } = setup();
    analytics.start();
    for (let i = 0; i < 500; i++) analytics.capture('project_opened', { project: `p${i}` });
    expect(sdk.capture).not.toHaveBeenCalled();
    expect(analytics.queued).toBeLessThanOrEqual(50);
  });

  it('survives a blocked SDK download and stops trying', async () => {
    const loadSdk = vi.fn(() => Promise.reject(new Error('blocked')));
    const { analytics, runIdle } = setup({ loadSdk });

    analytics.start();
    analytics.capture('resume_clicked', { location: 'about' });
    await runIdle();
    analytics.capture('resume_clicked', { location: 'about' });
    analytics.start();
    await runIdle();

    expect(loadSdk).toHaveBeenCalledTimes(1);
    expect(analytics.queued).toBe(0);
  });
});

describe('when the visitor opted out of tracking', () => {
  it('downloads nothing and captures nothing', async () => {
    const { analytics, sdk, loadSdk, idle, runIdle } = setup({ optedOut: () => true });

    analytics.start();
    analytics.capture('resume_clicked', { location: 'about' });
    analytics.pageview('https://example.test/');
    await runIdle();

    expect(idle).toHaveLength(0);
    expect(loadSdk).not.toHaveBeenCalled();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.capture).not.toHaveBeenCalled();
  });

  it('stops capturing if the signal turns on after the SDK loaded', async () => {
    let optedOut = false;
    const { analytics, sdk, runIdle } = setup({ optedOut: () => optedOut });
    analytics.start();
    await runIdle();

    optedOut = true;
    analytics.capture('contact_submitted');

    expect(sdk.capture).not.toHaveBeenCalled();
  });
});

describe('privacyOptOut', () => {
  it.each([
    ['Do Not Track on', { doNotTrack: '1' }, true],
    ['Do Not Track "yes" (old Firefox)', { doNotTrack: 'yes' }, true],
    ['Global Privacy Control on', { globalPrivacyControl: true }, true],
    ['both on', { doNotTrack: '1', globalPrivacyControl: true }, true],
    ['Do Not Track off', { doNotTrack: '0' }, false],
    ['Do Not Track unspecified', { doNotTrack: 'unspecified' }, false],
    ['no signal at all', {}, false],
    ['Do Not Track null', { doNotTrack: null }, false],
  ])('%s -> %s', (_name, navigatorLike, expected) => {
    expect(privacyOptOut(navigatorLike)).toBe(expected);
  });
});

describe('readAnalyticsConfig', () => {
  it('reads the token and host from build-time env values', () => {
    expect(
      readAnalyticsConfig({
        VITE_POSTHOG_PROJECT_TOKEN: 'phc_testtoken',
        VITE_POSTHOG_HOST: 'https://eu.i.posthog.com',
      }),
    ).toEqual({ token: 'phc_testtoken', host: 'https://eu.i.posthog.com' });
  });

  it('treats an empty or blank token as absent', () => {
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: '' }).token).toBeUndefined();
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: '   ' }).token).toBeUndefined();
    expect(readAnalyticsConfig({}).token).toBeUndefined();
  });

  it('defaults the host to the US cloud when only the token is set', () => {
    expect(readAnalyticsConfig({ VITE_POSTHOG_PROJECT_TOKEN: 'phc_testtoken' }).host).toBe(
      'https://us.i.posthog.com',
    );
  });

  it('drops a trailing slash from the host so the preconnect origin stays clean', () => {
    expect(
      readAnalyticsConfig({
        VITE_POSTHOG_PROJECT_TOKEN: 'phc_testtoken',
        VITE_POSTHOG_HOST: 'https://eu.i.posthog.com/',
      }).host,
    ).toBe('https://eu.i.posthog.com');
  });
});

describe('ingest preconnect', () => {
  const links = () => document.head.querySelectorAll('link[rel="preconnect"]');
  afterEach(() => {
    links().forEach((link) => link.remove());
  });

  it('adds one hint from start() once the visitor has not opted out', () => {
    const { analytics } = setup({ preconnect: addIngestPreconnect });

    analytics.start();
    analytics.start();

    expect(links()).toHaveLength(1);
    expect(links()[0]).toHaveAttribute('href', 'https://us.i.posthog.com');
    expect(links()[0]).toHaveAttribute('crossorigin', 'anonymous');
  });

  it('adds no hint when Do Not Track or Global Privacy Control is on', () => {
    const { analytics } = setup({ preconnect: addIngestPreconnect, optedOut: () => true });

    analytics.start();

    expect(links()).toHaveLength(0);
  });

  it('adds no hint when analytics is off', () => {
    const { analytics } = setup({ preconnect: addIngestPreconnect, token: undefined });

    analytics.start();

    expect(links()).toHaveLength(0);
  });
});

describe('ANALYTICS_EVENTS', () => {
  it('holds exactly the three named events', () => {
    expect(Object.values(ANALYTICS_EVENTS).sort()).toEqual([
      'contact_submitted',
      'project_opened',
      'resume_clicked',
    ]);
  });

  it('is frozen, so a stray assignment cannot add a fourth event', () => {
    expect(Object.isFrozen(ANALYTICS_EVENTS)).toBe(true);
  });

  it('names events in snake_case, the way PostHog groups them', () => {
    for (const name of Object.values(ANALYTICS_EVENTS)) {
      expect(name, `"${name}" is not snake_case`).toMatch(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/);
    }
  });
});

// Compile-time checks. `bunx tsc --noEmit` fails if a line below stops erroring.
export function typeChecks() {
  const analytics = createAnalytics({
    token: undefined,
    host: undefined,
    loadSdk: () => Promise.reject(new Error('unused')),
    whenIdle: () => {},
    optedOut: () => false,
  });
  // @ts-expect-error a typo in the event name must not compile
  analytics.capture('resume_clickd', { location: 'about' });
  // @ts-expect-error the property must match the event
  analytics.capture('project_opened', { location: 'about' });
  // @ts-expect-error resume_clicked needs a location
  analytics.capture('resume_clicked');
  analytics.capture('contact_submitted');
}
