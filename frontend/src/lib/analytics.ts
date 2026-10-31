import type { PostHogConfig } from 'posthog-js';

/**
 * The site's whole event vocabulary. A frozen map plus the property types below
 * mean a typo in an event name, or the wrong property, fails to compile instead
 * of quietly creating a second event that looks almost like the first.
 *
 * Deliberately small: someone took the resume, someone opened a project, someone
 * wrote a message. A pageview says anyone arrived at all. Everything else is scrolling.
 */
export const ANALYTICS_EVENTS = Object.freeze({
  /** The resume link was clicked. `location` says which one. */
  RESUME_CLICKED: 'resume_clicked',
  /** A link from the home to a project or experience page was clicked. `project` is the slug. */
  PROJECT_OPENED: 'project_opened',
  /** The contact form was submitted and the API accepted it. */
  CONTACT_SUBMITTED: 'contact_submitted',
} as const);

/** Where a "View resume" link sits, so the dashboard can tell the links apart. */
export type ResumeLocation = 'about' | 'education' | 'contact_band' | 'contact_page' | 'footer';

interface EventProperties {
  resume_clicked: { location: ResumeLocation };
  project_opened: { project: string };
  contact_submitted: undefined;
}

export type AnalyticsEvent = keyof EventProperties;

/** Events with no properties take no second argument. */
type CaptureArgs<E extends AnalyticsEvent> = EventProperties[E] extends undefined
  ? [properties?: undefined]
  : [properties: EventProperties[E]];

/** The two SDK calls this module makes. The real `posthog` object satisfies it. */
export interface SdkClient {
  init(token: string, config: Partial<PostHogConfig>): unknown;
  capture(event: string, properties?: Record<string, unknown>): unknown;
}

export interface AnalyticsDeps {
  /** The project token. Absent means analytics is off and the SDK is never fetched. */
  token: string | undefined;
  host: string | undefined;
  /** Fetches the SDK. A dynamic `import()` in production. */
  loadSdk: () => Promise<SdkClient>;
  /** Runs `run` once the browser has spare time. */
  whenIdle: (run: () => void) => void;
  /** True when the visitor asked not to be tracked. Read on every capture. */
  optedOut: () => boolean;
}

export interface Analytics {
  readonly enabled: boolean;
  /** How many events wait for the SDK. */
  readonly queued: number;
  /** Schedules the SDK download for an idle moment. Safe to call more than once. */
  start(): void;
  capture<E extends AnalyticsEvent>(event: E, ...args: CaptureArgs<E>): void;
  /** One pageview. The url is taken now, so a queued pageview keeps the page it was for. */
  pageview(url: string): void;
}

// A visitor who clicks around a page whose SDK never arrives (blocked, offline)
// must not grow this list for the whole session.
const QUEUE_LIMIT = 50;

type Queued = { event: string; properties: Record<string, unknown> | undefined };

type LoadState = 'idle' | 'scheduled' | 'ready' | 'failed';

/**
 * The choices that make this cookieless and event-only. Each one has a cost,
 * written up in the sprint notes.
 */
function sdkConfig(host: string | undefined): Partial<PostHogConfig> {
  return {
    api_host: host,
    // Pins the defaults PostHog shipped on that date, so a minor version bump
    // cannot change what is measured.
    defaults: '2026-08-30',
    // Nothing is written to cookies or localStorage, so no consent banner is needed.
    // The price: every full page load is a new anonymous visitor and a new session.
    persistence: 'memory',
    // Anonymous events, not person profiles. Nobody is ever identified here.
    person_profiles: 'identified_only',
    // The three named events and the pageview are the whole vocabulary.
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    // Pageviews come from the router, once per route change. See AnalyticsTracker.
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    // Feature flags are not used. This also skips the /flags request on every load.
    advanced_disable_flags: true,
  };
}

export function createAnalytics(deps: AnalyticsDeps): Analytics {
  const { token } = deps;
  const enabled = Boolean(token);
  let state: LoadState = 'idle';
  let client: SdkClient | null = null;
  let queue: Queued[] = [];

  function send(item: Queued) {
    client?.capture(item.event, item.properties);
  }

  function load() {
    if (!token) return;
    deps
      .loadSdk()
      .then((sdk) => {
        sdk.init(token, sdkConfig(deps.host));
        client = sdk;
        state = 'ready';
        const waiting = queue;
        queue = [];
        waiting.forEach(send);
      })
      .catch(() => {
        // A blocked or failed download costs the measurement, never the page.
        state = 'failed';
        queue = [];
      });
  }

  function enqueueOrSend(event: string, properties: Record<string, unknown> | undefined) {
    if (!enabled || state === 'failed' || deps.optedOut()) return;
    const item = { event, properties };
    if (state === 'ready') send(item);
    else if (queue.length < QUEUE_LIMIT) queue.push(item);
  }

  return {
    enabled,
    get queued() {
      return queue.length;
    },
    start() {
      if (!enabled || state !== 'idle' || deps.optedOut()) return;
      state = 'scheduled';
      deps.whenIdle(load);
    },
    capture(event, ...args) {
      enqueueOrSend(event, args[0]);
    },
    pageview(url) {
      enqueueOrSend('$pageview', { $current_url: url });
    },
  };
}

/** Do Not Track and Global Privacy Control are both treated as a request not to be measured. */
export function privacyOptOut(signals: {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
}): boolean {
  const dnt = signals.doNotTrack;
  return dnt === '1' || dnt === 'yes' || signals.globalPrivacyControl === true;
}

const DEFAULT_HOST = 'https://us.i.posthog.com';

/** Reads the two public build-time values. A blank token counts as no token. */
export function readAnalyticsConfig(env: Record<string, unknown>): {
  token: string | undefined;
  host: string;
} {
  const rawToken = env.VITE_POSTHOG_PROJECT_TOKEN;
  const token =
    typeof rawToken === 'string' && rawToken.trim() !== '' ? rawToken.trim() : undefined;
  const rawHost = env.VITE_POSTHOG_HOST;
  const host =
    typeof rawHost === 'string' && rawHost.trim() !== ''
      ? rawHost.trim().replace(/\/+$/, '')
      : DEFAULT_HOST;
  return { token, host };
}

/** `requestIdleCallback` where it exists, and a short timer on Safari. */
function whenBrowserIdle(run: () => void): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 2000);
  }
}

function browserOptedOut(): boolean {
  if (typeof navigator === 'undefined') return true;
  const nav: Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string } = navigator;
  return privacyOptOut({
    doNotTrack: nav.doNotTrack ?? nav.msDoNotTrack,
    globalPrivacyControl: nav.globalPrivacyControl,
  });
}

const config = readAnalyticsConfig(import.meta.env);

/** The one instance the app uses. Does nothing on the server and without a token. */
export const analytics: Analytics = createAnalytics({
  token: config.token,
  host: config.host,
  // Dynamic on purpose: the SDK is its own chunk, fetched after hydration and only
  // when a token was built in. The server render never reaches this line.
  loadSdk: () =>
    // The server bundle drops this branch, so the Worker does not carry the SDK.
    import.meta.env.SSR
      ? Promise.reject(new Error('The SDK loads in the browser only.'))
      : import('posthog-js').then((module) => module.default),
  whenIdle: whenBrowserIdle,
  optedOut: browserOptedOut,
});

/** The ingest origin, or undefined when analytics is off. For the preconnect hint. */
export const analyticsHost: string | undefined = config.token ? config.host : undefined;

/** Head links for the ingest origin. Empty when analytics is off, so no stray connection opens. */
export function ingestPreconnect(
  host: string | undefined,
): Array<{ rel: 'preconnect'; href: string; crossOrigin: 'anonymous' }> {
  return host ? [{ rel: 'preconnect', href: host, crossOrigin: 'anonymous' }] : [];
}
