import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RESUME_URL, fetchResume } from './fetch-resume.mjs';

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(23_317, 1)]); // 23,326 bytes

function reply(body, status = 200) {
  return new Response(body, { status });
}

describe('fetchResume', () => {
  let dir;
  let paths;
  let log;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'resume-'));
    paths = { pdf: join(dir, 'public', 'resume.pdf'), info: join(dir, 'generated', 'resume.json') };
    log = vi.fn();
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const exists = (p) =>
    access(p).then(
      () => true,
      () => false,
    );

  it('downloads the latest release asset without any credentials and records its size', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply(PDF));

    const result = await fetchResume({ fetch: fetchStub, paths, log });

    expect(result).toEqual({ status: 'fetched', bytes: 23_326 });
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe(DEFAULT_RESUME_URL);
    expect(DEFAULT_RESUME_URL).toBe(
      'https://github.com/alcash55/Resume/releases/latest/download/fullstack.pdf',
    );
    expect(JSON.stringify(init ?? {})).not.toMatch(/authorization/i);
    expect(Buffer.compare(await readFile(paths.pdf), PDF)).toBe(0);
    expect(JSON.parse(await readFile(paths.info, 'utf8'))).toEqual({
      available: true,
      bytes: 23_326,
    });
  });

  it('takes a different URL when one is given', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply(PDF));
    await fetchResume({ fetch: fetchStub, paths, log, url: 'https://files.test/r.pdf' });
    expect(fetchStub.mock.calls[0][0]).toBe('https://files.test/r.pdf');
  });

  it('writes an "unavailable" record and does not fail when the release is not public', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply('Not Found', 404));

    const result = await fetchResume({ fetch: fetchStub, paths, log });

    expect(result).toEqual({
      status: 'unavailable',
      reason: 'HTTP 404 from ' + DEFAULT_RESUME_URL,
    });
    expect(await exists(paths.pdf)).toBe(false);
    expect(JSON.parse(await readFile(paths.info, 'utf8'))).toEqual({ available: false });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('HTTP 404'));
  });

  it('drops an earlier download when the source now answers 404, so a stale resume is not served', async () => {
    await fetchResume({ fetch: vi.fn().mockResolvedValue(reply(PDF)), paths, log });
    await fetchResume({ fetch: vi.fn().mockResolvedValue(reply('Not Found', 404)), paths, log });
    expect(await exists(paths.pdf)).toBe(false);
    expect(JSON.parse(await readFile(paths.info, 'utf8'))).toEqual({ available: false });
  });

  it('treats a 200 that is not a PDF as a failure', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply('<html>sign in</html>'));
    const result = await fetchResume({ fetch: fetchStub, paths, log });
    expect(result.status).toBe('unavailable');
    expect(result.reason).toMatch(/not a PDF/);
    expect(await exists(paths.pdf)).toBe(false);
  });

  it('rejects with the URL and status when strict', async () => {
    const fetchStub = vi.fn().mockResolvedValue(reply('Not Found', 404));
    await expect(fetchResume({ fetch: fetchStub, paths, log, strict: true })).rejects.toThrow(
      `Resume fetch failed: HTTP 404 from ${DEFAULT_RESUME_URL}`,
    );
  });

  it('keeps the copy from the last good fetch when the network is down', async () => {
    await fetchResume({ fetch: vi.fn().mockResolvedValue(reply(PDF)), paths, log });

    const result = await fetchResume({
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')),
      paths,
      log,
    });

    expect(result).toEqual({ status: 'reused', bytes: 23_326 });
    expect(JSON.parse(await readFile(paths.info, 'utf8'))).toEqual({
      available: true,
      bytes: 23_326,
    });
  });

  it('does not reuse an old copy when strict', async () => {
    await fetchResume({ fetch: vi.fn().mockResolvedValue(reply(PDF)), paths, log });
    await expect(
      fetchResume({
        fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')),
        paths,
        log,
        strict: true,
      }),
    ).rejects.toThrow(/Resume fetch failed: fetch failed/);
  });

  it('ignores a leftover file that is not a PDF', async () => {
    await mkdir(dirname(paths.pdf), { recursive: true });
    await writeFile(paths.pdf, 'junk');
    const result = await fetchResume({
      fetch: vi.fn().mockRejectedValue(new TypeError('fetch failed')),
      paths,
      log,
    });
    expect(result.status).toBe('unavailable');
  });
});
