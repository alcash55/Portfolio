/**
 * Server-side log for crawlers and AI agents.
 *
 * The PostHog script never runs for GPTBot, ClaudeBot, PerplexityBot and the like, because
 * they read the HTML and stop. The Worker is the only place that sees them, so it forwards
 * those requests as `$http_log` events and PostHog classifies them by user agent.
 *
 * Human visitors are never logged here. The filter below is the privacy boundary: a
 * request without a crawler user agent returns before anything is built or sent.
 */

/** User agents worth a row: named AI crawlers and agents, plus generic bot markers. */
const CRAWLER_PATTERN = new RegExp(
  [
    'bot',
    'crawl',
    'spider',
    'slurp',
    'GPTBot',
    'ChatGPT',
    'OAI-SearchBot',
    'Claude',
    'anthropic',
    'Perplexity',
    'Gemini',
    'Google-Extended',
    'Bytespider',
    'CCBot',
    'cohere',
    'MistralAI',
    'HeadlessChrome',
    'PhantomJS',
  ].join('|'),
  'i',
);

/** Files crawlers ask for that are not HTML pages but still say who is looking. */
const TRACKED_FILES = new Set(['/robots.txt', '/sitemap.xml', '/llms.txt']);

export interface CrawlerLogConfig {
  token: string | undefined;
  host: string;
}

export interface CrawlerLogDeps {
  config: CrawlerLogConfig;
  send: (url: string, init: RequestInit) => Promise<unknown>;
  /** Keeps the Worker alive for the send without delaying the response. */
  waitUntil: (work: Promise<unknown>) => void;
}

/** A page or a tracked file. Assets, bundles and server functions are skipped. */
function isDocumentPath(pathname: string): boolean {
  if (TRACKED_FILES.has(pathname)) return true;
  const lastSegment = pathname.split('/').pop() ?? '';
  return !lastSegment.includes('.') && !pathname.startsWith('/_build');
}

/** The `$http_log` event for this request, or null when it is not a crawler hit. */
export function crawlerEvent(request: Request, token: string): Record<string, unknown> | null {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || !CRAWLER_PATTERN.test(userAgent)) return null;
  const url = new URL(request.url);
  if (!isDocumentPath(url.pathname)) return null;

  const properties: Record<string, unknown> = {
    // No person profile: a crawler is not a person, and this keeps the row out of
    // the people list.
    $process_person_profile: false,
    $current_url: url.href,
    $host: url.host,
    $pathname: url.pathname,
    $raw_user_agent: userAgent,
    method: request.method,
  };
  const referrer = request.headers.get('referer');
  if (referrer) properties.$referrer = referrer;
  // The crawler's address lets PostHog match published bot IP ranges.
  const ip = request.headers.get('cf-connecting-ip');
  if (ip) properties.$ip = ip;

  return {
    api_key: token,
    event: '$http_log',
    distinct_id: `http_log_${crypto.randomUUID()}`,
    properties,
  };
}

/** Sends the event in the background. Never throws and never delays the page. */
export function logCrawlerVisit(request: Request, deps: CrawlerLogDeps): void {
  const { token, host } = deps.config;
  if (!token) return;
  try {
    const event = crawlerEvent(request, token);
    if (!event) return;
    deps.waitUntil(
      deps
        .send(`${host}/i/v0/e/`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(event),
        })
        .catch(() => undefined),
    );
  } catch {
    // Analytics must not break a page. A dropped event is the whole cost.
  }
}
