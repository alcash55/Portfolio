import { apiEndpoint } from './apiUrl';

/** The visible text of every resume link. */
export const RESUME_LABEL = 'View resume';

/**
 * Accessible name for a "View resume" link. The visible text comes first. The link always
 * opens a new tab, and when the API cannot supply the file that tab shows the explanation.
 */
export const RESUME_LINK_NAME = `${RESUME_LABEL} (PDF, opens in a new tab)`;

// Render's free tier takes about 30 seconds to wake. The keep-alive ping makes that rare,
// and failing sooner would show the explanation page for a request about to succeed.
export const RESUME_TIMEOUT_MS = 35_000;

export interface ResumeDeps {
  readonly fetch: typeof fetch;
  /** Base URL of the Go API. Empty means none is configured. */
  readonly apiUrl: string;
}

/**
 * The resume PDF from GET /api/v1/resume, ready to send to the visitor, or null when the API
 * has none to give. The caller renders the explanation page for null. Nothing from a failed
 * answer reaches the visitor, so upstream errors never leak.
 */
export async function fetchResume(deps: ResumeDeps): Promise<Response | null> {
  if (deps.apiUrl === '') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESUME_TIMEOUT_MS);
  try {
    const upstream = await deps.fetch(apiEndpoint(deps.apiUrl, '/api/v1/resume'), {
      signal: controller.signal,
    });
    const type = upstream.headers.get('Content-Type') ?? '';
    if (!upstream.ok || !upstream.body || !type.startsWith('application/pdf')) {
      await upstream.body?.cancel();
      return null;
    }
    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="Alex-Cash-Resume.pdf"',
      // Matches the API's own max-age. A new release reaches visitors within minutes.
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    });
    const length = upstream.headers.get('Content-Length');
    if (length) headers.set('Content-Length', length);
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return null;
  } finally {
    // Only the wait for headers is timed. The PDF is small and the API sends it from memory.
    clearTimeout(timer);
  }
}
