import { afterEach, describe, expect, it, vi } from 'vitest';
import { RESUME_LINK_NAME, RESUME_TIMEOUT_MS, fetchResume } from './resume';

const API = 'https://api.example.test';
const PDF = '%PDF-1.7 fake';

function upstream(status: number, body: string, headers: Record<string, string> = {}) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status, headers }));
}

describe('fetchResume', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('streams the PDF from /api/v1/resume as an inline file with a fixed name', async () => {
    const fetchImpl = upstream(200, PDF, {
      'Content-Type': 'application/pdf',
      'Content-Length': String(PDF.length),
      'X-Resume-Version': 'v1.2.0',
    });
    const res = await fetchResume({ fetch: fetchImpl, apiUrl: `${API}/` });
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(`${API}/api/v1/resume`);
    expect(res?.status).toBe(200);
    expect(res?.headers.get('Content-Type')).toBe('application/pdf');
    expect(res?.headers.get('Content-Disposition')).toBe('inline; filename="Alex-Cash-Resume.pdf"');
    expect(res?.headers.get('Content-Length')).toBe(String(PDF.length));
    expect(res?.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(res?.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await res?.text()).toBe(PDF);
  });

  it('passes on no upstream header it did not choose', async () => {
    const fetchImpl = upstream(200, PDF, {
      'Content-Type': 'application/pdf',
      'X-Resume-Version': 'v1.2.0',
      'Set-Cookie': 'a=b',
    });
    const res = await fetchResume({ fetch: fetchImpl, apiUrl: API });
    expect(res?.headers.get('X-Resume-Version')).toBeNull();
    expect(res?.headers.get('Set-Cookie')).toBeNull();
  });

  it.each([
    ['a 502, GitHub failing', 502],
    ['a 503, no token on the API', 503],
    ['a 404', 404],
  ])('returns null on %s, so the route renders the explanation page', async (_name, status) => {
    const fetchImpl = upstream(status, '{"error":"could not load resume"}', {
      'Content-Type': 'application/json',
    });
    await expect(fetchResume({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });

  it('returns null for a 200 that is not a PDF, such as a host error page', async () => {
    const fetchImpl = upstream(200, '<html>waking</html>', { 'Content-Type': 'text/html' });
    await expect(fetchResume({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });

  it('returns null when the request fails', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    await expect(fetchResume({ fetch: fetchImpl, apiUrl: API })).resolves.toBeNull();
  });

  it('returns null when the API does not answer in time', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
        }),
    );
    const result = fetchResume({ fetch: fetchImpl, apiUrl: API });
    await vi.advanceTimersByTimeAsync(RESUME_TIMEOUT_MS);
    await expect(result).resolves.toBeNull();
  });

  it('makes no request when no API URL is configured', async () => {
    const fetchImpl = upstream(200, PDF, { 'Content-Type': 'application/pdf' });
    await expect(fetchResume({ fetch: fetchImpl, apiUrl: '' })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('RESUME_LINK_NAME', () => {
  it('puts the visible text first and names the file type and the new tab', () => {
    expect(RESUME_LINK_NAME).toBe('View resume (PDF, opens in a new tab)');
  });
});
