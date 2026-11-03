import { expect, test, VIEWPORTS } from './fixtures';
import { CHAPTER_COUNT } from '../src/content/home';

test.describe('home, assembled', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('renders all twelve chapters in order, each reachable from the index', async ({ page }) => {
    await page.goto('/');
    const numbers = await page
      .locator('section[data-ch]')
      .evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-ch'))));
    expect(numbers, 'chapter numbers in document order').toEqual(
      Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1),
    );
    const ids = await page
      .locator('#cidx a[data-n]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('href')?.replace('#', '') ?? ''));
    for (const id of ids) await expect(page.locator(`#${id}`), `#${id} exists`).toHaveCount(1);
  });

  test('every project and experience figure has a real body', async ({ page }) => {
    await page.goto('/');
    const empty = await page
      .locator('[data-slot="figure"], .fig-slot')
      .evaluateAll((els) => els.map((el) => el.closest('section')?.id));
    expect(empty, 'chapters still showing an empty figure slot').toEqual([]);
  });

  test('chapters 8 to 10 draw their diagram, labeled as in the comp, with no printed text version', async ({
    page,
  }) => {
    await page.goto('/');
    const drawings = [
      ['Architecture of the seven-market submission platform', 'Seven ISO submission APIs'],
      ['Pipeline from team repositories to the Voyix docs site', 'Markdown stays with the team'],
      ['Store Health workflow from user interviews to the React dashboard', 'Country-level view'],
    ] as const;
    for (const [name, label] of drawings) {
      const drawing = page.getByRole('img', { name });
      await drawing.scrollIntoViewIfNeeded();
      await expect(drawing, name).toBeVisible();
      await expect(drawing.getByText(label), label).toBeVisible();
    }
    await expect(page.getByText('Text version.')).toHaveCount(0);
  });
});

test.describe('the Projects anchor', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  test('/#projects lands on the first project chapter, with no section of its own', async ({
    page,
  }) => {
    await page.goto('/#projects');
    await expect(page.locator('section.projects-intro')).toHaveCount(0);
    const chapter = page.locator('#projects');
    await expect(chapter).toHaveAttribute('data-ch', '2');
    await expect(chapter.getByRole('heading', { level: 2 })).toBeInViewport();
  });
});

test.describe('home chapter heights, desktop', () => {
  test.use({ viewport: VIEWPORTS.desktop });

  // The comp sizes each desktop chapter to one snapport (viewport minus the header), so a
  // wheel tick or Page Down moves exactly one chapter. A taller chapter gets skipped past.
  // The comp's own AC checks chapter runs 23px over at this height, so 24px is the allowance.
  test("every chapter is one snapport tall, give or take the comp's own 24px", async ({ page }) => {
    await page.goto('/');
    const header = await page
      .locator('header')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    const heights = await page
      .locator('section[data-ch]')
      .evaluateAll((els) => els.map((el) => [el.id, el.getBoundingClientRect().height] as const));
    const snapport = VIEWPORTS.desktop.height - header;
    for (const [id, height] of heights) {
      const note = `#${id} is ${height}px, snapport ${snapport}px`;
      expect(height - snapport, note).toBeLessThanOrEqual(24);
      expect(snapport - height, note).toBeLessThanOrEqual(1);
    }
  });

  test('the recordings and the checks card sit in the Fig frame without a second frame', async ({
    page,
  }) => {
    await page.goto('/');
    const nested = await page.locator('.fig .mcap, .fig .checks').evaluateAll((els) =>
      els.map((el) => {
        const style = getComputedStyle(el);
        return {
          cls: el.className,
          border: style.borderTopWidth,
          shadow: style.boxShadow,
          visible: el.getBoundingClientRect().height > 1,
        };
      }),
    );
    for (const item of nested) {
      expect(item.border, `${item.cls} border`).toBe('0px');
      expect(item.shadow, `${item.cls} shadow`).toBe('none');
    }
  });
});

test.describe('home paging, desktop', () => {
  test.use({ viewport: VIEWPORTS.desktop, reducedMotion: 'reduce' });

  // Scroll snap stays on mandatory because no key or wheel gesture skips a chapter.
  for (const key of ['PageDown', 'Space'] as const) {
    test(`${key} moves exactly one chapter at a time`, async ({ page }) => {
      await page.goto('/');
      await page.locator('body').click({ position: { x: 5, y: 300 } });
      const chapterAtTop = () =>
        page.evaluate(() => {
          const top = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
          const hit = [...document.querySelectorAll<HTMLElement>('section[data-ch]')].find(
            (el) => Math.abs(el.getBoundingClientRect().top - top) < 2,
          );
          return hit ? Number(hit.dataset.ch) : 0;
        });
      for (let want = 2; want <= 13; want += 1) {
        await page.keyboard.press(key);
        await expect
          .poll(chapterAtTop, { message: `after ${want - 1} presses of ${key}` })
          .toBe(want);
      }
    });
  }

  test('a wheel gesture moves one chapter and never skips one', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(683, 400);
    const scrollY = () => page.evaluate(() => Math.round(window.scrollY));
    const header = await page
      .locator('header')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    const snapport = VIEWPORTS.desktop.height - header;
    const first = await scrollY();
    for (let i = 0; i < 5; i += 1) {
      // No pause between notches: a gap near the browser's gesture timeout splits the burst
      // into single notches, and a single notch snaps back to the chapter it started on.
      await page.mouse.wheel(0, 100);
    }
    await expect.poll(scrollY, { message: 'one notch burst from the top' }).toBe(first + snapport);
  });

  // Read more drops its text down in the prose column, so an open chapter is taller than
  // the snapport. Its snap area grows with it. The next chapter must still come next.
  test('with Read more open, paging still reaches the next chapter and skips none', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => document.querySelector('#experience')?.scrollIntoView());
    await page.locator('#experience summary').click();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.mouse.click(5, 300);
    const header = await page
      .locator('header')
      .first()
      .evaluate((el) => el.getBoundingClientRect().height);
    // The chapter that holds the line under the header, and whether its top is on that line.
    const reading = () =>
      page.evaluate((top) => {
        const hit = [...document.querySelectorAll<HTMLElement>('section[data-ch]')].find((el) => {
          const box = el.getBoundingClientRect();
          return box.top <= top + 2 && box.bottom > top + 2;
        });
        return hit ? Number(hit.dataset.ch) : 0;
      }, header);
    await expect.poll(reading, { message: 'starts in chapter 8' }).toBe(8);
    const open = await page
      .locator('#experience')
      .evaluate((el) => el.getBoundingClientRect().height);
    const snapport = VIEWPORTS.desktop.height - header;
    expect(open, 'the open chapter is taller than one snapport').toBeGreaterThan(snapport);

    await page.keyboard.press('PageDown');
    await expect.poll(reading, { message: 'PageDown from the open chapter' }).toBe(9);

    await page.keyboard.press('PageUp');
    await expect.poll(reading, { message: 'PageUp back' }).toBe(8);
    await page.mouse.move(683, 400);
    for (let burst = 0; burst < 2; burst += 1) {
      for (let i = 0; i < 5; i += 1) await page.mouse.wheel(0, 100);
      await page.waitForTimeout(600);
      expect(await reading(), `after wheel burst ${burst + 1}`).toBeLessThanOrEqual(9);
    }
    await expect.poll(reading, { message: 'two bursts reach chapter 9' }).toBe(9);
  });
});

test.describe('home diagrams on a phone', () => {
  test.use({ viewport: VIEWPORTS.phone });

  test('the tall diagrams show at 390px, wide enough to read', async ({ page }) => {
    await page.goto('/');
    for (const id of ['experience', 'ncr-voyix', 'ncr-store-health']) {
      const svg = page.locator(`#${id} svg[role="img"]`);
      await svg.scrollIntoViewIfNeeded();
      await expect(svg, id).toBeVisible();
      const box = await svg.boundingBox();
      expect(box?.width, `${id} width`).toBeGreaterThanOrEqual(270);
    }
  });
});
