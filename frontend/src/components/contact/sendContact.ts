import type { ContactValues } from './validate';

/**
 * Why a send failed, derived from the HTTP status only. The UI picks its copy
 * from this kind and never reads the server's own error text, so rewording a
 * backend message cannot change what a visitor sees.
 */
export type ContactErrorKind =
  | 'validation' // 400
  | 'too_large' // 413
  | 'rate_limited' // 429
  | 'server_error' // 502, any other non-2xx status, or a network failure
  | 'timeout'; // aborted after the cold start allowance

export type SendResult = { ok: true } | { ok: false; kind: ContactErrorKind };

// A cold API host can take close to a minute to wake. Aborting at 60 seconds
// leaves room for that instead of failing a request that was about to succeed.
export const CONTACT_TIMEOUT_MS = 60_000;

export type SendDeps = {
  fetch: typeof fetch;
  /** Base URL of the Go API, with or without a trailing slash. */
  apiUrl: string;
};

function kindForStatus(status: number): ContactErrorKind {
  switch (status) {
    case 400:
      return 'validation';
    case 413:
      return 'too_large';
    case 429:
      return 'rate_limited';
    default:
      return 'server_error';
  }
}

export async function sendContact(values: ContactValues, deps: SendDeps): Promise<SendResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);
  const url = `${deps.apiUrl.replace(/\/+$/, '')}/api/v1/contact`;

  try {
    const response = await deps.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // `website` is the honeypot the API checks. People never see it, so it
      // always goes out empty.
      body: JSON.stringify({
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        website: '',
      }),
      signal: controller.signal,
    });
    return response.ok ? { ok: true } : { ok: false, kind: kindForStatus(response.status) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, kind: 'timeout' };
    }
    return { ok: false, kind: 'server_error' };
  } finally {
    clearTimeout(timer);
  }
}
