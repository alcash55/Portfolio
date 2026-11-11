import { describe, expect, it, vi } from 'vitest';
import { crawlerEvent, logCrawlerVisit } from './crawlerLog';

const GPTBOT = 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2';
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function req(path: string, headers: Record<string, string> = {}, method = 'GET'): Request {
  return new Request(`https://portfolio.example.workers.dev${path}`, { method, headers });
}

describe('crawlerEvent', () => {
  it('builds an $http_log event for an AI crawler on a page', () => {
    const event = crawlerEvent(
      req('/projects', { 'user-agent': GPTBOT, 'cf-connecting-ip': '203.0.113.7' }),
      'phc_test',
    );
    expect(event).toMatchObject({
      api_key: 'phc_test',
      event: '$http_log',
      properties: {
        $process_person_profile: false,
        $host: 'portfolio.example.workers.dev',
        $pathname: '/projects',
        $raw_user_agent: GPTBOT,
        $ip: '203.0.113.7',
        method: 'GET',
      },
    });
    expect(String(event?.distinct_id)).toMatch(/^http_log_/);
  });

  it('ignores a normal browser', () => {
    expect(crawlerEvent(req('/', { 'user-agent': CHROME }), 'phc_test')).toBeNull();
  });

  it('ignores a request with no user agent', () => {
    expect(crawlerEvent(req('/'), 'phc_test')).toBeNull();
  });

  it('ignores assets, bundles and non-GET methods', () => {
    expect(crawlerEvent(req('/assets/app.js', { 'user-agent': GPTBOT }), 'phc_test')).toBeNull();
    expect(crawlerEvent(req('/_build/x', { 'user-agent': GPTBOT }), 'phc_test')).toBeNull();
    expect(crawlerEvent(req('/', { 'user-agent': GPTBOT }, 'POST'), 'phc_test')).toBeNull();
  });

  it('keeps robots.txt and llms.txt', () => {
    expect(crawlerEvent(req('/robots.txt', { 'user-agent': GPTBOT }), 'phc_test')).not.toBeNull();
    expect(crawlerEvent(req('/llms.txt', { 'user-agent': GPTBOT }), 'phc_test')).not.toBeNull();
  });
});

describe('logCrawlerVisit', () => {
  const config = { token: 'phc_test', host: 'https://us.i.posthog.com' };

  it('posts the event to the capture endpoint through waitUntil', async () => {
    const send = vi.fn().mockResolvedValue(new Response());
    const waitUntil = vi.fn();
    logCrawlerVisit(req('/', { 'user-agent': GPTBOT }), { config, send, waitUntil });
    expect(waitUntil).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith(
      'https://us.i.posthog.com/i/v0/e/',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends nothing for a browser or without a token', () => {
    const send = vi.fn();
    const waitUntil = vi.fn();
    logCrawlerVisit(req('/', { 'user-agent': CHROME }), { config, send, waitUntil });
    logCrawlerVisit(req('/', { 'user-agent': GPTBOT }), {
      config: { token: undefined, host: config.host },
      send,
      waitUntil,
    });
    expect(send).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it('swallows a failed send', async () => {
    const send = vi.fn().mockRejectedValue(new Error('offline'));
    const waitUntil = vi.fn();
    logCrawlerVisit(req('/', { 'user-agent': GPTBOT }), { config, send, waitUntil });
    await expect(waitUntil.mock.calls[0]?.[0]).resolves.toBeUndefined();
  });

  it('does not throw when send itself throws', () => {
    const send = vi.fn(() => {
      throw new TypeError('Illegal invocation');
    });
    const waitUntil = vi.fn();
    expect(() =>
      logCrawlerVisit(req('/', { 'user-agent': GPTBOT }), { config, send, waitUntil }),
    ).not.toThrow();
  });
});
