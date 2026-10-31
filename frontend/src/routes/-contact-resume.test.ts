import { createMemoryHistory, isRedirect } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeInfo } from '~/lib/resume';

const state = vi.hoisted(() => ({ info: { available: false } as ResumeInfo }));

vi.mock('~/lib/resume', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/resume')>()),
  get resumeInfo() {
    return state.info;
  },
}));

const { getRouter } = await import('~/router');

async function load(path: string) {
  const router = getRouter();
  router.update({ ...router.options, history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load();
  const meta = router.state.matches.flatMap((match) => match.meta ?? []);
  const title = meta.findLast((tag) => tag && 'title' in tag);
  return {
    router,
    meta,
    title: title && 'title' in title ? title.title : undefined,
  };
}

beforeEach(() => {
  state.info = { available: false };
});

describe('/contact route', () => {
  it('sets its title and description', async () => {
    const { title, meta } = await load('/contact');
    expect(title).toBe('Contact, Alex Cash');
    expect(meta).toContainEqual({
      name: 'description',
      content: 'Email Alex Cash, view his resume, or send a message.',
    });
  });
});

describe('/resume route', () => {
  it('redirects to the PDF with a 302 when the build fetched one', async () => {
    state.info = { available: true, bytes: 23326 };
    const { router } = await load('/resume');
    expect(router.state.location.pathname).toBe('/resume.pdf');

    // The router follows the redirect and drops its status, so read it where it is thrown.
    const { Route } = await import('./resume');
    let thrown: unknown;
    try {
      await (Route.options.beforeLoad as () => unknown)();
    } catch (error) {
      thrown = error;
    }
    expect(isRedirect(thrown) && thrown.options.statusCode).toBe(302);
  });

  it('stays on /resume and explains when there is no PDF', async () => {
    const { router, title } = await load('/resume');
    expect(router.state.location.pathname).toBe('/resume');
    expect(title).toBe('Resume, Alex Cash');
  });
});
