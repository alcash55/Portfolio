import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import { apiUrl } from './lib/apiUrl';
import { pingApi } from './lib/keepAlive';

// The slice of Cloudflare's ExecutionContext used here. Declared locally because the
// project does not generate Worker types.
interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

const entry = createServerEntry({
  // Unchanged from the default entry: every request goes to Start.
  fetch: (request) => handler.fetch(request),
});

export default {
  ...entry,
  /**
   * Cron Trigger (see `triggers` in wrangler.jsonc). Pings the API so Render's free plan
   * does not spin it down. GitHub Actions schedules drop runs, so this replaces them.
   */
  scheduled(_controller: unknown, _env: unknown, ctx: WorkerContext): void {
    // A wrapper, not the bare global: Workers throw "Illegal invocation" when fetch is
    // called as a property of another object.
    const send: typeof fetch = (input, init) => fetch(input, init);
    ctx.waitUntil(pingApi({ fetch: send, apiUrl: apiUrl(), warn: console.warn }));
  },
};
