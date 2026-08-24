import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Projects from './Projects';
import { staticProjects, type StaticProject } from './staticProjects';
import { projectDetails } from './projectDetails';
import { projectLinks } from './projectLinks';
import { projectSlug } from './projectSlug';
import { siteStats } from '../../../generated/siteStats';
import type { ApiProject } from './useProjects';

/**
 * The card's button, found the same way the dialog finds it to hand focus
 * back: by slug. Deliberately not "the element containing this text" -- the
 * dialog contains the project's name too, so a text lookup starts matching
 * two things the moment a dialog is open.
 */
const cardFor = (project: StaticProject | { name: string }): HTMLElement => {
  const card = document.querySelector<HTMLElement>(
    `[data-project-slug="${projectSlug(project)}"]`,
  );
  if (!card) throw new Error(`no project card found for "${project.name}"`);
  return card;
};

const apiProject = (overrides: Partial<ApiProject> = {}): ApiProject => ({
  name: 'Little-Town',
  description: 'from GitHub, should never be shown -- the static description owns this card',
  url: 'https://github.com/alcash55/Little-Town',
  homepage: 'https://littletown.gay/',
  language: 'TypeScript',
  stars: 42,
  topics: [],
  updatedAt: '2026-08-01T12:00:00Z',
  ...overrides,
});

const okResponse = (projects: ApiProject[]) =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ projects, stale: false }),
  }) as unknown as Response;

describe('Projects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    // The dialog lives in the URL fragment, and jsdom keeps one window for the
    // whole file -- a hash left behind by one test opens a dialog in the next
    // one, on mount, before it has asserted anything.
    window.history.replaceState(null, '', '/');
  });

  it('shows skeletons (not the project cards) while the fetch is in flight (F2)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { container } = render(<Projects />);

    expect(
      screen.queryByText('Game Competition Website'),
      'a static project title must not render yet while loading',
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('.MuiSkeleton-root').length,
      'expected skeleton placeholders while the request is in flight',
    ).toBeGreaterThan(0);
  });

  it('renders exactly one skeleton grid item per static project, so the grid layout does not jump once data lands (F2)', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    const { container } = render(<Projects />);

    const skeletonGridItems = container.querySelectorAll('[data-testid="project-grid-item"]');
    expect(
      skeletonGridItems.length,
      `expected ${staticProjects.length} skeleton grid items (one per static project), got ${skeletonGridItems.length}`,
    ).toBe(staticProjects.length);
  });

  it('renders every static project from its own data when the API call succeeds, with live metadata merged in (F1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse([apiProject({ name: 'Little-Town', stars: 42 })])),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    // All four static cards render regardless of which ones the API matched.
    for (const project of staticProjects) {
      expect(
        screen.getByText(project.name),
        `expected the static card "${project.name}" to render`,
      ).toBeInTheDocument();
    }

    // Live metadata for the matched repo is shown.
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('the static description always wins over the API description (F1)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse([
          apiProject({
            name: 'Little-Town',
            description: 'THIS SHOULD NEVER APPEAR ON SCREEN',
          }),
        ]),
      ),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    expect(
      screen.getByText(/A fullstack website for video game competitions/i),
      'expected the hand-written description to render',
    ).toBeInTheDocument();
    expect(
      screen.queryByText('THIS SHOULD NEVER APPEAR ON SCREEN'),
      'the API description must never override a hand-written one',
    ).not.toBeInTheDocument();
  });

  it('a project with no matching API entry still renders purely from static data', async () => {
    // The API only knows about Little-Town; the other three repos are absent
    // from the response entirely (e.g. allow-list drift, or a 404 the
    // backend chose to skip).
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse([apiProject({ name: 'Little-Town' })])),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Portfolio Website')).toBeInTheDocument());

    expect(screen.getByText('AC Composite Actions')).toBeInTheDocument();
    expect(screen.getByText('VS Code Royalty Theme')).toBeInTheDocument();
  });

  it('reaches a real outbound link from inside every card’s dialog, including the projects that are not on GitHub', async () => {
    // The successor to "links every card somewhere". The card used to *be* the
    // outbound link; it is a button that opens a dialog now, and the links
    // moved inside it. The property worth protecting did not change: for every
    // single project there is an `<a>` with a real http(s) href that a
    // keyboard can reach. A card that opens a dialog with no link in it looks
    // completely fine in a screenshot and is a dead end for anyone using it.
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([apiProject()])));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('The Cliper-er')).toBeInTheDocument());

    for (const project of staticProjects) {
      const card = cardFor(project);
      expect(
        card.querySelector('a'),
        `the "${project.name}" card is a button now -- an anchor here means the old behaviour came back`,
      ).toBeNull();

      await user.click(card);
      const dialog = await screen.findByRole('dialog');

      // `getAllByRole` throws when there are none, which is the failure this
      // test exists to catch.
      const links = within(dialog).getAllByRole('link');
      expect(
        links.length,
        `the "${project.name}" dialog must offer at least one outbound link`,
      ).toBeGreaterThan(0);

      for (const link of links) {
        expect(
          link.getAttribute('href'),
          `"${project.name}" has a link (${link.textContent}) that goes nowhere real`,
        ).toMatch(/^https?:\/\//);
        expect(link).toHaveAttribute('target', '_blank');
        // A new tab that can reach back into `window.opener` is the reason
        // this pairing is not optional.
        expect(link.getAttribute('rel'), `"${project.name}" opens a tab unsafely`).toContain(
          'noopener',
        );
      }

      const hrefs = links.map((link) => link.getAttribute('href'));
      expect(
        hrefs,
        `the "${project.name}" dialog must match its projectLinks() contract exactly`,
      ).toEqual(projectLinks(project).map((link) => link.href));

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('links each project where Alex said it should go: the GitHub repo first, the old destination second', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([apiProject()])));
    render(<Projects />);
    await waitFor(() => expect(screen.getByText('The Cliper-er')).toBeInTheDocument());

    // Game Competition Website: the card used to lead to littletown.gay and
    // there was no way to reach the source from this page at all. Now it is
    // the repo first, the live site kept as a second button rather than
    // dropped.
    await user.click(cardFor({ name: 'Game Competition Website' }));
    let links = within(await screen.findByRole('dialog')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://github.com/alcash55/Little-Town',
      'https://littletown.gay/',
    ]);
    expect(links[1]).toHaveTextContent('Live site');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // VS Code Royalty Theme: same shape, with the Marketplace listing second.
    await user.click(cardFor({ name: 'VS Code Royalty Theme' }));
    links = within(await screen.findByRole('dialog')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://github.com/alcash55/Royalty-VS-Code-Theme',
      'https://marketplace.visualstudio.com/items?itemName=Alcash55.royaltytheme',
    ]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // Portfolio: its `href` already is its repo, so there is one button and
    // not two identical ones.
    await user.click(cardFor({ name: 'Portfolio Website' }));
    links = within(await screen.findByRole('dialog')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://github.com/alcash55/Portfolio',
    ]);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // The Cliper-er is private and local-only: no repo to link, so the
    // channel it publishes to is the only link, and it is the primary one.
    await user.click(cardFor({ name: 'The Cliper-er' }));
    links = within(await screen.findByRole('dialog')).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.youtube.com/@TheCliper-er',
    ]);
    expect(links[0]).toHaveTextContent('YouTube channel');
  });

  it('never merges live metadata onto a project that has no repoName, even for a nameless API entry', async () => {
    // A partial/garbled API entry is the failure this guards: with a plain
    // `find`, `p.name === project.repoName` would be `undefined === undefined`
    // -- true -- and this entry's stars would land on every non-GitHub card.
    const nameless = { ...apiProject(), name: undefined } as unknown as ApiProject;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([nameless])));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('The Cliper-er')).toBeInTheDocument());

    const repoless = staticProjects.filter((p) => !p.repoName).map((p) => p.name);
    expect(repoless, 'The Cliper-er is the project with no GitHub repo').toEqual(['The Cliper-er']);

    const card = screen.getByText('The Cliper-er').closest('[data-testid="project-grid-item"]');
    expect(
      card!.textContent,
      "the nameless API entry's stars must not appear on The Cliper-er card",
    ).not.toMatch(/42|TypeScript/);
  });

  it('tells the visitor when the API served cached data (stale: true)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ projects: [apiProject()], stale: true }),
      } as unknown as Response),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Showing cached GitHub data')).toBeInTheDocument());

    // The live numbers still render -- cached data is real data, just older.
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('says nothing about caching when the data is fresh (stale: false)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse([apiProject()])));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    expect(screen.queryByText(/cached/i), 'a fresh response must not mention caching').toBeNull();
  });

  it('says nothing about caching when the API is unreachable, since there is no live data to qualify', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    // The static fallback is meant to be indistinguishable from a normal
    // render -- a "cached" note here would be both wrong (nothing was served
    // from cache) and a tell that something broke.
    expect(screen.queryByText(/cached/i)).toBeNull();
    consoleError.mockRestore();
  });

  it('falls back to the static list, indistinguishable from today, on a 502 (F3)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.resolve({ error: 'could not load projects' }),
      } as unknown as Response),
    );
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    // No error banner, no empty section -- and no live metadata, since none
    // was ever received.
    expect(screen.queryByText(/error|failed|unavailable/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(
      consoleError,
      'the only allowed console noise on a 502 fallback is a single console.error',
    ).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('falls back to the static list, indistinguishable from today, on a network throw (F3)', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    render(<Projects />);

    await waitFor(() => expect(screen.getByText('Game Competition Website')).toBeInTheDocument());

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });

  it('falls back to the static list, indistinguishable from today, after a 60s timeout (F3)', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }),
    );
    render(<Projects />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    for (const project of staticProjects) {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    }
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});

/**
 * The dialog behind each card. These render the whole section rather than the
 * dialog alone, because most of what is worth pinning here is the wiring
 * *between* the two: which card opened it, where focus goes when it closes,
 * and what the URL says while it is open.
 */
describe('the project dialog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
  });

  /** Renders the section with a stubbed API and waits for the cards. */
  const renderProjects = async (projects: ApiProject[] = [apiProject()]) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(projects)));
    render(<Projects />);
    await waitFor(() => expect(screen.getByText('The Cliper-er')).toBeInTheDocument());
    return userEvent.setup();
  };

  it('opens from any card, is labelled by its own title, and takes focus with it', async () => {
    const user = await renderProjects();

    for (const project of staticProjects) {
      const card = cardFor(project);
      expect(
        card,
        'a card that opens a dialog has to say so -- the visible text cannot',
      ).toHaveAttribute('aria-haspopup', 'dialog');

      await user.click(card);
      const dialog = await screen.findByRole('dialog');

      // `aria-labelledby` -> the title, so it is announced as "<project>,
      // dialog" instead of just "dialog". Checked by following the id rather
      // than by trusting that the attribute exists.
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy, `the "${project.name}" dialog has no accessible name`).toBeTruthy();
      expect(document.getElementById(labelledBy as string)).toHaveTextContent(project.name);

      expect(
        dialog.contains(document.activeElement),
        `focus stayed outside the "${project.name}" dialog, so a keyboard user is still on the page behind it`,
      ).toBe(true);

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('dismisses on Escape, on the backdrop, and on the close button -- each returning focus to the card that opened it', async () => {
    const user = await renderProjects();

    // 1. Escape.
    await user.click(cardFor({ name: 'Portfolio Website' }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(cardFor({ name: 'Portfolio Website' }), 'focus was dropped after Escape').toHaveFocus(),
    );

    // 2. The backdrop.
    await user.click(cardFor({ name: 'Portfolio Website' }));
    await screen.findByRole('dialog');
    const backdrop = document.querySelector('.MuiBackdrop-root');
    expect(backdrop, 'a modal with no backdrop cannot be dismissed by clicking away').not.toBeNull();
    await user.click(backdrop as Element);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(
        cardFor({ name: 'Portfolio Website' }),
        'focus was dropped after a backdrop click',
      ).toHaveFocus(),
    );

    // 3. The explicit close button, which is the only one of the three that
    // exists on a touch device with no keyboard and a full-screen dialog.
    await user.click(cardFor({ name: 'Portfolio Website' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() =>
      expect(
        cardFor({ name: 'Portfolio Website' }),
        'focus was dropped after the close button',
      ).toHaveFocus(),
    );
  });

  it('opens straight from a `#projects/<slug>` link on a cold load', async () => {
    // The shared-link case: nobody clicked anything, so there is no
    // "previously focused element" for MUI to restore focus to either.
    window.history.replaceState(null, '', '#projects/the-cliper-er');
    await renderProjects();

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('The Cliper-er');
  });

  it('leaves the bare `#projects` anchor alone, since the section header links to it', async () => {
    // `#projects` is the in-page anchor the header's link icon uses. If the
    // scheme ever swallowed it, that button would start opening a dialog --
    // or worse, stop scrolling anywhere.
    window.history.replaceState(null, '', '#projects');
    await renderProjects();

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('link', { name: /navigate to projects/i })).toHaveAttribute(
      'href',
      '#projects',
    );
  });

  it('ignores a hash that names a project which does not exist', async () => {
    // A link shared before a project was renamed or removed. Opening nothing
    // is right; opening an empty dialog is not.
    window.history.replaceState(null, '', '#projects/a-project-that-was-deleted');
    await renderProjects();

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('follows the hash when the browser navigates, so the back button closes it', async () => {
    const user = await renderProjects();

    await user.click(cardFor({ name: 'AC Composite Actions' }));
    await screen.findByRole('dialog');
    expect(window.location.hash).toBe('#projects/ac-composite-actions');

    // What the back button does: change the fragment, then fire hashchange.
    act(() => {
      window.history.replaceState(null, '', '#projects');
      window.dispatchEvent(new Event('hashchange'));
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('adds one history entry when it opens and none when it closes', async () => {
    // Opening pushes, so the back button closes the dialog (which is what a
    // full-screen dialog on a phone has to do). Closing replaces, so a visitor
    // who opened and closed three cards does not have to press back six times
    // to leave the page.
    const user = await renderProjects();
    const before = window.history.length;

    await user.click(cardFor({ name: 'VS Code Royalty Theme' }));
    await screen.findByRole('dialog');
    expect(window.history.length, 'opening should push exactly one entry').toBe(before + 1);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.history.length, 'closing must replace, not push').toBe(before + 1);
    expect(window.location.hash, 'closing should leave the section anchor behind').toBe('#projects');
  });

  it('gives the long-form treatment to exactly the two finished projects, and a paragraph to the rest', async () => {
    // Alex's call on spec 01 decision 1. Written as an exhaustive walk rather
    // than two spot-checks, so promoting a third project is a deliberate edit
    // to this list instead of something that happens by accident.
    const LONG_FORM = ['Portfolio Website', 'The Cliper-er'];
    const HEADINGS = ['The problem', 'What was hard', "What I'd do differently"];
    const user = await renderProjects();

    for (const project of staticProjects) {
      await user.click(cardFor(project));
      const dialog = await screen.findByRole('dialog');

      const headings = within(dialog)
        .queryAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);

      if (LONG_FORM.includes(project.name)) {
        expect(headings, `"${project.name}" should carry the full three sections`).toEqual(HEADINGS);
      } else {
        expect(
          headings,
          `"${project.name}" is meant to be one paragraph, not a long-form story`,
        ).toEqual([]);
      }

      // Every project gets *something* written about it, long-form or not.
      const summary = projectDetails[project.name]?.summary;
      expect(summary, `"${project.name}" has no summary in projectDetails`).toBeTruthy();
      expect(dialog.textContent).toContain((summary as string).slice(0, 40));

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    }
  });

  it('quotes the generated test counts, not numbers somebody typed', async () => {
    // The rot risk: "102 unit tests" is wrong on the next commit unless it
    // comes from the runners themselves. `siteStats` is regenerated by the
    // build, so asserting against it means this test moves with the real
    // count instead of pinning a stale one.
    const user = await renderProjects();

    await user.click(cardFor({ name: 'Portfolio Website' }));
    const dialog = await screen.findByRole('dialog');

    expect(siteStats.unitTests, 'the generated count looks unset').toBeGreaterThan(0);
    expect(siteStats.browserTests, 'the generated count looks unset').toBeGreaterThan(0);
    expect(dialog.textContent).toContain(`${siteStats.unitTests} unit tests`);
    expect(dialog.textContent).toContain(`${siteStats.browserTests} browser tests`);
  });

  it('tells the WCAG story and the API numbers behind this site, in the Portfolio dialog', async () => {
    // These are the specific claims the "this site" content was meant to make.
    // If the copy is rewritten they should survive the rewrite; if they are
    // dropped, that should be a decision rather than a slip.
    const user = await renderProjects();

    await user.click(cardFor({ name: 'Portfolio Website' }));
    const dialog = await screen.findByRole('dialog');

    expect(dialog.textContent, 'the contrast ratios are the evidence').toContain('4.99:1');
    expect(dialog.textContent).toContain('12.72:1');
    expect(dialog.textContent, 'the AA body-text threshold is the point of the story').toContain(
      '4.5:1',
    );
    expect(dialog.textContent).toContain('Six themes and three layout modes');
    expect(dialog.textContent, 'the cache behaviour is what the API is for').toMatch(
      /single-flight/i,
    );
    expect(dialog.textContent).toMatch(/Lighthouse \d+ performance/);
  });

  it('shows live GitHub metadata inside the dialog when the API matched the repo', async () => {
    const user = await renderProjects([apiProject({ name: 'Little-Town', stars: 42 })]);

    await user.click(cardFor({ name: 'Game Competition Website' }));
    const dialog = await screen.findByRole('dialog');

    // Stars are the unambiguous one: the language appears twice on purpose,
    // once as a hand-written "built with" chip and once as the repo's live
    // primary language, and those two are allowed to disagree.
    expect(within(dialog).getByText('42'), 'the live star count never made it in').toBeInTheDocument();
    expect(dialog.textContent, 'the live "last updated" date never made it in').toMatch(/Updated /);
    expect(within(dialog).getAllByText('TypeScript').length).toBeGreaterThan(0);
  });

  it('opens a complete dialog for a project the API knows nothing about', async () => {
    // The static-fallback discipline, applied to the dialog: no live metadata
    // is not a broken dialog, it is a dialog with one less row in it.
    const user = await renderProjects([]);

    await user.click(cardFor({ name: 'The Cliper-er' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getAllByRole('link').length).toBeGreaterThan(0);
    expect(dialog.textContent).not.toMatch(/error|failed|unavailable/i);
  });
});
