import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_TIMEOUT_MS, sendContact } from './sendContact';

const values = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there.' };
const apiUrl = 'https://api.test';

function reply(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('sendContact', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('posts trimmed JSON with an empty honeypot to the contact endpoint', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply(200, { status: 'ok' }));

    const result = await sendContact(
      { name: ' Ada Lovelace ', email: ' ada@example.com ', message: ' Hello there. ' },
      { fetch: fetchStub, apiUrl },
    );

    expect(result).toEqual({ ok: true });
    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.test/api/v1/contact');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual({ ...values, website: '' });
  });

  it('does not double the slash when the base URL ends with one', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply(200));
    await sendContact(values, { fetch: fetchStub, apiUrl: 'https://api.test/' });
    expect(fetchStub.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/contact');
  });

  it.each([
    [400, 'validation'],
    [413, 'too_large'],
    [429, 'rate_limited'],
    [502, 'server_error'],
    [500, 'server_error'],
    [404, 'server_error'],
  ] as const)('maps HTTP %i to the %s failure', async (status, kind) => {
    const fetchStub = vi.fn().mockResolvedValue(reply(status, { error: 'internal wording' }));
    await expect(sendContact(values, { fetch: fetchStub, apiUrl })).resolves.toEqual({
      ok: false,
      kind,
    });
  });

  it('survives an error response with a body that is not JSON', async () => {
    const fetchStub = vi.fn().mockResolvedValue(new Response('<html>', { status: 502 }));
    await expect(sendContact(values, { fetch: fetchStub, apiUrl })).resolves.toEqual({
      ok: false,
      kind: 'server_error',
    });
  });

  it('reports a network failure as a server error', async () => {
    const fetchStub = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(sendContact(values, { fetch: fetchStub, apiUrl })).resolves.toEqual({
      ok: false,
      kind: 'server_error',
    });
  });

  it('aborts after the cold start allowance and reports a timeout', async () => {
    vi.useFakeTimers();
    const fetchStub = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    const pending = sendContact(values, { fetch: fetchStub, apiUrl });
    await vi.advanceTimersByTimeAsync(CONTACT_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toEqual({ ok: false, kind: 'timeout' });
    expect(CONTACT_TIMEOUT_MS).toBe(60_000);
  });
});
