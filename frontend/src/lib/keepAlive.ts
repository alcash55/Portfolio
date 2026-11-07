import { apiEndpoint } from './apiUrl';

// Render's free plan spins the API down after about 15 minutes idle and takes 30 to 50
// seconds to wake it. The cron fires every 10 minutes, and the ping that lands on a cold
// API must wait out the wake, so the limit is longer than any normal cold start.
export const KEEP_ALIVE_TIMEOUT_MS = 60_000;

export interface KeepAliveDeps {
  readonly fetch: typeof fetch;
  /** Base URL of the Go API. Empty means none is configured, so there is nothing to keep warm. */
  readonly apiUrl: string;
  /** Receives the one line logged when a ping fails. */
  readonly warn: (line: string) => void;
  readonly timeoutMs?: number;
}

/**
 * Sends GET /healthz so the free-plan API does not go idle. Never throws: a dead API must
 * not fail the cron run, and the next run tries again. The log line holds a status or an
 * error name only, since an error message could carry the URL.
 */
export async function pingApi(deps: KeepAliveDeps): Promise<void> {
  if (deps.apiUrl === '') return;
  try {
    const response = await deps.fetch(apiEndpoint(deps.apiUrl, '/healthz'), {
      signal: AbortSignal.timeout(deps.timeoutMs ?? KEEP_ALIVE_TIMEOUT_MS),
    });
    await response.body?.cancel();
    if (response.status !== 200) {
      deps.warn(`keep-alive: GET /healthz returned ${response.status}`);
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : 'unknown error';
    deps.warn(`keep-alive: GET /healthz failed: ${name}`);
  }
}
