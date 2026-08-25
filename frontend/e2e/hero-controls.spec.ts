import { test, expect, type Page } from '@playwright/test';

/**
 * The hero's floating theme/layout controls (see
 * `src/components/Pages/Landing/HeroControls.tsx`).
 *
 * Everything here needs a real browser: where an absolutely-positioned,
 * continuously-animated control actually lands, what it lands on top of,
 * whether a moving target can be hit by a real pointer, and what its parts
 * measure against the surface they are painted on. jsdom answers none of those
 * questions -- the unit tests next to the component cover naming, pressed
 * state, DOM order and the media-query branches instead.
 *
 * The controls replaced the hero's settings-drawer hamburger, so this file also
 * guards the thing that would make that removal a regression: the drawer still
 * being reachable everywhere else.
 */

const DESKTOP = { width: 1280, height: 800 };
const NARROW_DESKTOP = { width: 900, height: 800 };
const MOBILE = { width: 390, height: 844 };
const TINY = { width: 320, height: 700 };

const THEME_CONTROLS = [
  'Dark theme',
  'Blue theme',
  'Light theme',
  'Red theme',
  'Purple theme',
  'Green theme',
];
const LAYOUT_CONTROLS = ['Top nav layout', 'Side nav layout'];
const THEME_NAMES = ['dark', 'blue', 'light', 'red', 'purple', 'green'];
const ALL_CONTROLS = [...THEME_CONTROLS, ...LAYOUT_CONTROLS];

/**
 * The one network call the page makes on load, stubbed for every test so this
 * suite asserts against the frontend alone. Copied from `smoke.spec.ts`, and
 * for the same reason: with a real `VITE_API_URL` the result depends on whether
 * a Go backend happens to be running, which is what made a console-error check
 * pass on a developer machine and fail in CI.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/projects', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [], stale: false }),
    }),
  );
});

/**
 * Navigates home and waits for the hero to settle.
 *
 * Waiting for the `<h1>` alone is not enough for anything that measures
 * geometry. The hero's text is laid out in fallback metrics until the
 * self-hosted webfonts arrive, and the swap moves the centred content column
 * by ~96px at 320px wide -- so a measurement taken before it can be of a layout
 * that exists for one font-load and is never seen again. (Found the hard way:
 * this suite passed in isolation and failed in a parallel run, purely on which
 * one won the race.)
 */
async function gotoHome(page: Page) {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Alex Cash');
  await page.evaluate(() => document.fonts.ready);
  // One frame for the post-swap layout to be committed before it is read.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/** Every control, in DOM order, which is the order they take focus. */
const controlNames = (page: Page) =>
  page.$$eval('#landing [aria-pressed]', (nodes) =>
    nodes.map((node) => node.getAttribute('aria-label')),
  );

test.describe('keyboard', () => {
  test('the controls are the first eight tab stops, in a fixed order, each with a visible focus ring', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    for (const expected of ALL_CONTROLS) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element) return null;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          name: element.getAttribute('aria-label'),
          outlineWidth: parseFloat(style.outlineWidth),
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          // The ring is pulled inside the button on purpose, so it is drawn on
          // the control's own opaque surface rather than on whatever the hero
          // happens to be painting behind it.
          outlineOffset: parseFloat(style.outlineOffset),
          width: Math.round(box.width),
          height: Math.round(box.height),
        };
      });

      expect(focused, 'tabbing left the document').not.toBeNull();
      expect(focused?.name, `expected ${expected} to be the next tab stop`).toBe(expected);
      expect(focused?.outlineStyle, `${expected} has no focus ring`).toBe('solid');
      expect(focused?.outlineWidth, `${expected}'s focus ring is invisible`).toBeGreaterThanOrEqual(
        2,
      );
      expect(
        focused?.outlineOffset,
        `${expected}'s focus ring sits outside its own surface`,
      ).toBeLessThan(0);
      // 44px is the target-size floor these were built to; a control that
      // shrinks below it stops being hittable while it drifts.
      expect(focused?.width, `${expected} is smaller than a touch target`).toBeGreaterThanOrEqual(
        44,
      );
      expect(focused?.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('Enter on a focused theme control switches the theme and persists it', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    await page.getByLabel('Green theme').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByLabel('Green theme')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Dark theme')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('green');

    // Focus must survive the theme swap -- the whole tree re-renders under a
    // new ThemeProvider, and losing focus to <body> would strand a keyboard
    // user at the top of the document.
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(
      'Green theme',
    );
  });
});

test.describe('pressed state follows the app, in every theme', () => {
  for (const [index, name] of THEME_CONTROLS.entries()) {
    const themeName = ['dark', 'blue', 'light', 'red', 'purple', 'green'][index];

    test(`${themeName}: only "${name}" reads as pressed`, async ({ page }) => {
      // Set before the app's first script runs: Context.tsx resolves the saved
      // theme synchronously in a lazy initializer, not in an effect.
      await page.addInitScript((value) => localStorage.setItem('theme', value), themeName);
      await page.setViewportSize(DESKTOP);
      await gotoHome(page);

      const pressed = await page.$$eval('#landing [aria-pressed="true"]', (nodes) =>
        nodes.map((node) => node.getAttribute('aria-label')),
      );
      // The layout control for the active layout is pressed too; the point is
      // that exactly one *theme* is.
      expect(pressed.filter((label) => label?.endsWith('theme'))).toEqual([name]);

      // And the hero really is wearing that theme, not just claiming to.
      const heroBackground = await page.evaluate(
        () => getComputedStyle(document.getElementById('landing') as HTMLElement).backgroundColor,
      );
      const expectedBackground: Record<string, string> = {
        dark: 'rgb(32, 32, 32)',
        blue: 'rgb(25, 34, 49)',
        light: 'rgb(244, 245, 247)',
        red: 'rgb(42, 13, 13)',
        purple: 'rgb(28, 21, 38)',
        green: 'rgb(16, 31, 25)',
      };
      expect(heroBackground).toBe(expectedBackground[themeName]);
    });
  }
});

test.describe('layout controls', () => {
  test('switching to sideNav from the hero leaves a working page, and switches back', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
    page.on('pageerror', (error) => errors.push(error.message));

    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    await page.getByLabel('Side nav layout').focus();
    await page.keyboard.press('Enter');

    // The shell swaps its chrome under us; the control must survive it, keep
    // focus, and tell the truth about the new layout.
    await expect(page.getByLabel('Side nav layout')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Top nav layout')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => localStorage.getItem('layout'))).toBe('sideNav');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(
      'Side nav layout',
    );
    // The sideNav chrome is actually up, and the hero's own nav links are gone
    // with the layout that owned them.
    await expect(page.locator('#landing nav button')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);

    await page.getByLabel('Top nav layout').focus();
    await page.keyboard.press('Enter');

    await expect(page.getByLabel('Top nav layout')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('layout'))).toBe('default');
    await expect(page.locator('#landing nav button')).toHaveCount(5);
    await expect(page.locator('h1')).toHaveCount(1);

    expect(errors).toEqual([]);
  });

  test('are absent on a phone, where the shell forces the mobile layout anyway', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    await gotoHome(page);

    expect(await controlNames(page)).toEqual(THEME_CONTROLS);
    for (const name of LAYOUT_CONTROLS) {
      await expect(page.getByLabel(name)).toHaveCount(0);
    }
  });

  test('are absent at 320px too, and present again at 900px', async ({ page }) => {
    await page.setViewportSize(TINY);
    await gotoHome(page);
    expect(await controlNames(page)).toEqual(THEME_CONTROLS);

    await page.setViewportSize(NARROW_DESKTOP);
    await expect(page.getByLabel('Top nav layout')).toHaveCount(1);
    expect(await controlNames(page)).toEqual(ALL_CONTROLS);
  });
});

test.describe('placement', () => {
  const geometry = () =>
    // Runs in the page: returns each control's rect alongside the rects of
    // everything a control must not cover.
    ({
      // Measured at rest, with the lap switched off for the length of one
      // reflow and then put back. The slack below is measured *from* the
      // resting position, so reading a control mid-lap would count its drift
      // twice and demand 26px of clearance instead of 14 -- which is exactly
      // how this first failed once the lap grew.
      controls: Array.from(document.querySelectorAll('#landing [aria-pressed]')).map((element) => {
        const control = element as HTMLElement;
        const running = control.style.animation;
        control.style.animation = 'none';
        const box = control.getBoundingClientRect();
        control.style.animation = running;
        return {
          name: control.getAttribute('aria-label') ?? '?',
          x: box.x,
          y: box.y,
          right: box.right,
          bottom: box.bottom,
        };
      }),
      obstacles: (() => {
        const found: { kind: string; x: number; y: number; right: number; bottom: number }[] = [];
        const add = (kind: string, box: DOMRect) => {
          if (box.width < 1 || box.height < 1) return;
          found.push({ kind, x: box.x, y: box.y, right: box.right, bottom: box.bottom });
        };
        // Text is measured with a Range, not with the element box: these are
        // block elements spanning the whole content column, so their boxes
        // claim empty space the reader never sees ink in.
        const textSelectors = [
          '#landing nav button',
          '#landing .MuiTypography-caption',
          '#landing h1',
          '#landing p.MuiTypography-body1',
        ];
        for (const selector of textSelectors) {
          document.querySelectorAll(selector).forEach((element, index) => {
            // The bento cards' hover captions sit at opacity 0 until their
            // image is hovered; nothing is covering them.
            if (parseFloat(getComputedStyle(element).opacity) === 0) return;
            const range = document.createRange();
            range.selectNodeContents(element);
            Array.from(range.getClientRects()).forEach((rect, line) =>
              add(`${selector}[${index}].${line}`, rect as DOMRect),
            );
          });
        }
        // The other interactive things in the hero: covering one would steal
        // its clicks, not just look untidy.
        document
          .querySelectorAll('#landing a.MuiIconButton-root, #landing [data-scroll-indicator]')
          .forEach((element, index) =>
            add(`interactive[${index}]`, element.getBoundingClientRect()),
          );
        // App chrome that is painted *over* the hero from outside it, and so
        // was invisible to a sweep that only looked inside `#landing`: the
        // mobile settings Fab and bottom navigation bar, the sideNav Fab. All
        // of them sit above the controls' layer, so a control underneath one is
        // both hidden and unclickable -- which is exactly what happened to a
        // control at 390px until this was added.
        const hero = (document.getElementById('landing') as HTMLElement).getBoundingClientRect();
        document.querySelectorAll('body *').forEach((element) => {
          if (element.closest('#landing')) return;
          const style = getComputedStyle(element);
          if (!['fixed', 'absolute', 'sticky'].includes(style.position)) return;
          if (style.visibility === 'hidden' || parseFloat(style.opacity) === 0) return;
          const box = element.getBoundingClientRect();
          if (box.width < 4 || box.height < 4) return;
          const clearOfHero =
            box.right < hero.x || box.x > hero.right || box.bottom < hero.y || box.y > hero.bottom;
          if (clearOfHero) return;
          add(`chrome:${element.getAttribute('aria-label') ?? element.tagName.toLowerCase()}`, box);
        });
        return found;
      })(),
      viewportWidth: window.innerWidth,
      heroBottom: (document.getElementById('landing') as HTMLElement).getBoundingClientRect()
        .bottom,
    });

  // The lap carries a control up to 12px from its resting point (the keyframes
  // are checked against this number in `the drift itself` below), so every
  // control is checked with 14px of slack in each direction: a control that
  // only clears the text at rest is a control that lands on it four seconds
  // later. This grew from 7 when the drift stopped being a 6px twitch -- the
  // slack tracks the travel, it does not excuse it.
  const DRIFT = 14;

  /**
   * Puts the page in `themeName` by clicking the control for it, then waits for
   * the font that theme ships to land.
   *
   * Themes are not just colour here: each one names its own font family, and at
   * 320px four of the six wrap the h1 onto a second line, which pushes the
   * social links 96px down the hero. A sweep in one theme therefore proves
   * nothing about the other five -- a control that cleared the mail button in
   * dark sat right beside it in green. Clicked rather than reloaded because it
   * is faster and it is what a visitor actually does.
   */
  async function wearTheme(page: Page, themeName: string) {
    const label = `${themeName[0].toUpperCase()}${themeName.slice(1)} theme`;
    await page.evaluate((selector) => {
      (document.querySelector(selector) as HTMLElement).click();
    }, `#landing [aria-label="${label}"]`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  }

  /** Asserts no control touches anything it must not, at whatever the page is wearing. */
  async function expectClear(page: Page, where: string) {
    const { controls, obstacles, viewportWidth, heroBottom } = await page.evaluate(geometry);

    expect(controls.length, `${where}: no controls rendered`).toBeGreaterThan(0);
    for (const control of controls) {
      for (const obstacle of obstacles) {
        const overlapping =
          control.x - DRIFT < obstacle.right &&
          control.right + DRIFT > obstacle.x &&
          control.y - DRIFT < obstacle.bottom &&
          control.bottom + DRIFT > obstacle.y;
        expect(
          overlapping,
          `${where}: ${control.name} [${Math.round(control.x)},${Math.round(control.y)} ` +
            `${Math.round(control.right)},${Math.round(control.bottom)}] sits on top of ` +
            `${obstacle.kind} [${Math.round(obstacle.x)},${Math.round(obstacle.y)} ` +
            `${Math.round(obstacle.right)},${Math.round(obstacle.bottom)}]`,
        ).toBe(false);
      }
      // A control that hangs off the right edge is both unreachable and a
      // source of the horizontal scrollbar `smoke.spec.ts` forbids.
      expect(
        control.right + DRIFT,
        `${where}: ${control.name} hangs off the right edge`,
      ).toBeLessThanOrEqual(viewportWidth);
      expect(
        control.x - DRIFT,
        `${where}: ${control.name} hangs off the left edge`,
      ).toBeGreaterThanOrEqual(0);
      // The hero clips its own overflow, so a control below its bottom edge
      // is simply invisible.
      expect(
        control.bottom + DRIFT,
        `${where}: ${control.name} is clipped by the hero`,
      ).toBeLessThanOrEqual(heroBottom);
    }
  }

  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1440, height: 900 },
    DESKTOP,
    { width: 1152, height: 720 },
    // The narrowest window that still gets the gutter regime: `#landing` is
    // 48px narrower than the window, so 1072 leaves a hero of exactly 1024 and
    // the side bands are as thin as they are ever allowed to be. The nearest
    // width the sweep used to check was 1280, which left a 1232px hero -- 200px
    // of slack that hid whatever happens at the boundary.
    { width: 1072, height: 700 },
    { width: 1024, height: 768 },
    NARROW_DESKTOP,
    { width: 768, height: 1024 },
    { width: 700, height: 700 },
    MOBILE,
    TINY,
  ]) {
    test(`nothing is covered, in any theme, at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      await gotoHome(page);

      for (const themeName of THEME_NAMES) {
        await wearTheme(page, themeName);
        await expectClear(page, `${themeName} at ${size.width}x${size.height}`);
      }
    });
  }

  // The sideNav layout is reachable from the hero itself, and it is not a
  // variation on the same geometry: the sidebar takes 248px off the left, so a
  // 1280px window has a 960px hero -- the narrow regime, at a width that is in
  // the wide one without it -- and it parks a Fab in the hero's bottom-right
  // corner. None of that was covered while every test here ran in `default`.
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1600, height: 900 },
    { width: 1440, height: 900 },
    DESKTOP,
    NARROW_DESKTOP,
  ]) {
    test(`nothing is covered in the sideNav layout at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.addInitScript(() => localStorage.setItem('layout', 'sideNav'));
      await page.setViewportSize(size);
      await gotoHome(page);

      for (const themeName of THEME_NAMES) {
        await wearTheme(page, themeName);
        await expectClear(page, `sideNav ${themeName} at ${size.width}x${size.height}`);
      }
    });
  }

  /**
   * Each control's resting centre as a fraction of the hero's width and
   * height, measured with the lap switched off. Fractions rather than pixels
   * because the whole point is which *band* a control is in, and the hero is a
   * different width in every case this file sweeps.
   */
  const restingCentres = () => {
    const hero = (document.getElementById('landing') as HTMLElement).getBoundingClientRect();
    return Array.from(document.querySelectorAll('#landing [aria-pressed]')).map((element) => {
      const control = element as HTMLElement;
      const running = control.style.animation;
      control.style.animation = 'none';
      const box = control.getBoundingClientRect();
      control.style.animation = running;
      return {
        name: control.getAttribute('aria-label') ?? '?',
        x: (box.x + box.width / 2 - hero.x) / hero.width,
        y: (box.y + box.height / 2 - hero.y) / hero.height,
      };
    });
  };

  const LEFT_BAND = ['Blue theme', 'Dark theme', 'Light theme', 'Red theme'];
  const RIGHT_BAND = ['Green theme', 'Purple theme', 'Side nav layout', 'Top nav layout'];

  /**
   * Four a side, which is the thing that was actually asked for -- six down the
   * left and two at the bottom right is what this replaced. Asserted per theme
   * and per layout because a control's resting place is a percentage of a hero
   * whose width the sidebar changes, and because each theme ships its own font
   * and so moves the content column the bands have to keep clear of.
   */
  test.describe('four a side, wherever the hero is wide enough to have sides', () => {
    const wide = [
      { layout: 'default', size: { width: 1920, height: 1080 } },
      { layout: 'default', size: DESKTOP },
      { layout: 'default', size: { width: 1072, height: 700 } },
      { layout: 'sideNav', size: { width: 1920, height: 1080 } },
      { layout: 'sideNav', size: { width: 1440, height: 900 } },
    ];

    for (const { layout, size } of wide) {
      test(`${layout} at ${size.width}x${size.height}`, async ({ page }) => {
        await page.addInitScript((value) => localStorage.setItem('layout', value), layout);
        await page.setViewportSize(size);
        await gotoHome(page);

        for (const themeName of THEME_NAMES) {
          await wearTheme(page, themeName);
          const centres = await page.evaluate(restingCentres);
          const where = `${layout} ${themeName} at ${size.width}x${size.height}`;

          expect(centres.map((c) => c.name).sort()).toEqual([...ALL_CONTROLS].sort());
          expect(
            centres
              .filter((c) => c.x < 0.5)
              .map((c) => c.name)
              .sort(),
            `${where}: left band`,
          ).toEqual(LEFT_BAND);
          expect(
            centres
              .filter((c) => c.x >= 0.5)
              .map((c) => c.name)
              .sort(),
            `${where}: right band`,
          ).toEqual(RIGHT_BAND);
        }
      });
    }
  });

  /**
   * Tab order is DOM order, and DOM order is fixed; what this checks is that
   * the *positions* still agree with it. Within each band the controls have to
   * descend in the order they are tabbed, or a keyboard user's focus ring jumps
   * back up the page part-way down a band.
   */
  test('each band descends in tab order', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    const centres = await page.evaluate(restingCentres);
    const order = await controlNames(page);
    expect(order).toEqual(ALL_CONTROLS);

    const centreOf = (name: string | null) => centres.find((c) => c.name === name)!;
    for (const [side, band] of [
      ['left', order.filter((n) => centreOf(n).x < 0.5)],
      ['right', order.filter((n) => centreOf(n).x >= 0.5)],
    ] as const) {
      expect(band, `${side} band is not four controls`).toHaveLength(4);
      for (let i = 1; i < band.length; i++)
        expect(
          centreOf(band[i]).y,
          `${side} band: ${band[i]} tabs after ${band[i - 1]} but sits above it`,
        ).toBeGreaterThan(centreOf(band[i - 1]).y);
    }
  });

  /**
   * The shape rules, read back off the rendered page. Two earlier attempts at
   * this control field were rejected on looks -- once as a docked pill toolbar,
   * once as an evenly-ruled zig-zag ladder -- and moving two controls into a
   * band that already had two is exactly how a band turns into a tidy column.
   * These are the properties that separate "scattered" from "ruled", and none
   * of them is visible to a test that only checks nothing overlaps.
   */
  test('neither band is a ruled column', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    const centres = await page.evaluate(restingCentres);
    const bands = {
      left: centres.filter((c) => c.x < 0.5).sort((a, b) => a.y - b.y),
      right: centres.filter((c) => c.x >= 0.5).sort((a, b) => a.y - b.y),
    };

    for (const [side, band] of Object.entries(bands)) {
      expect(band, `${side} band is not four controls`).toHaveLength(4);

      // Not a column: the depths into the band have to differ by more than a
      // rendering rounding error.
      const depths = band.map((c) => c.x);
      expect(
        Math.max(...depths) - Math.min(...depths),
        `${side} band: every control sits at the same depth`,
      ).toBeGreaterThan(0.05);

      // No three of them on a line. Twice the triangle area, in hero fractions:
      // three dots on a line read as a ruled edge whatever their spacing.
      for (let i = 0; i < band.length; i++)
        for (let j = i + 1; j < band.length; j++)
          for (let k = j + 1; k < band.length; k++) {
            const [a, b, c] = [band[i], band[j], band[k]];
            const area = Math.abs(a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
            expect(
              area,
              `${side} band: ${a.name}, ${b.name} and ${c.name} are on a line`,
            ).toBeGreaterThan(0.008);
          }
    }

    // And no vertical rhythm across the set as a whole: evenly-stepped tops are
    // what made the rejected version read as a ladder.
    const tops = centres.map((c) => c.y).sort((a, b) => a - b);
    const gaps = tops.slice(1).map((t, i) => t - tops[i]);
    for (let i = 0; i < gaps.length; i++)
      for (let j = i + 1; j < gaps.length; j++)
        expect(
          Math.abs(gaps[i] - gaps[j]),
          `two vertical gaps share a rhythm: ${gaps[i].toFixed(3)} and ${gaps[j].toFixed(3)}`,
        ).toBeGreaterThan(0.01);
  });

  /**
   * The other half of the ask, and the half that is easy to get wrong: below a
   * 1024px hero there are no side bands to even up. The controls scatter across
   * the lower half, which is the only region clear of text at every width down
   * to 320px, so anything that pushed them out to two edges there would put
   * them straight back on the subtitle.
   */
  test('the narrow regime stays a scatter, with no sides to balance', async ({ page }) => {
    for (const size of [MOBILE, TINY, { width: 700, height: 700 }]) {
      await page.setViewportSize(size);
      await gotoHome(page);

      const centres = await page.evaluate(restingCentres);
      const where = `${size.width}x${size.height}`;
      expect(centres.length, `${where}: no controls rendered`).toBeGreaterThanOrEqual(6);

      // At least one control resting in the middle third is what makes this a
      // field rather than two columns.
      expect(
        centres.filter((c) => c.x > 0.33 && c.x < 0.67).length,
        `${where}: the controls have been pushed out to the edges`,
      ).toBeGreaterThan(0);

      // And all of them below the hero's midline, clear of the text above.
      for (const control of centres)
        expect(control.y, `${where}: ${control.name} left the lower half`).toBeGreaterThan(0.5);
    }
  });

  test('the drift itself stays inside the slack this suite allows it', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    // Read back the keyframes the component actually shipped. Every check above
    // is only honest if the lap really is bounded by DRIFT, and that bound
    // lives in a CSS rule no other test can see.
    const laps = await page.evaluate(() =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules);
          } catch {
            return [];
          }
        })
        .filter(
          (rule): rule is CSSKeyframesRule =>
            rule instanceof CSSKeyframesRule && rule.name.startsWith('heroControlDrift'),
        )
        .map((rule) => {
          const offsets = Array.from(rule.cssRules).map((frame) => {
            const [x, y] = /translate\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px\s*\)/
              .exec((frame as CSSKeyframeRule).style.transform)
              ?.slice(1)
              .map(Number) ?? [NaN, NaN];
            return Math.hypot(x, y);
          });
          return { name: rule.name, stops: offsets.length, furthest: Math.max(...offsets) };
        }),
    );

    expect(laps.length, 'the drift keyframes are gone').toBeGreaterThanOrEqual(1);
    for (const lap of laps) {
      expect(
        lap.furthest,
        `${lap.name} drifts further than the geometry slack`,
      ).toBeLessThanOrEqual(DRIFT);
      // The other direction, which is the regression that was actually
      // reported: a lap this small is travelled so slowly that the rendered
      // position steps between whole pixels instead of moving.
      expect(lap.furthest, `${lap.name} is too small a lap to read as motion`).toBeGreaterThan(6);
      // Four stops make a lap four straight legs and four hard turns; twelve
      // make it a curve.
      expect(lap.stops, `${lap.name} has too few stops to read as a curve`).toBeGreaterThanOrEqual(
        10,
      );
    }
  });
});

test.describe('a moving target', () => {
  test('drifts continuously, stops under the pointer, and can still be clicked while moving', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    const control = page.getByLabel('Blue theme');
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };

    // It is animating, on its own keyframes rather than the decorative field's
    // `float` -- same character, different job.
    const animation = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        name: style.animationName,
        duration: parseFloat(style.animationDuration),
        delay: parseFloat(style.animationDelay),
        easing: style.animationTimingFunction,
        willChange: style.willChange,
        state: style.animationPlayState,
      };
    });
    expect(animation.name).toMatch(/^heroControlDrift[ABC]$/);
    expect(animation.name).not.toBe('float');
    // Fast enough to be seen moving, slow enough not to be a distraction: this
    // window is where the reported choppiness was fixed. The previous 20-28s
    // lap moved ~0.3px a second, which the browser renders as a jump to the
    // next pixel every few seconds.
    expect(animation.duration).toBeGreaterThanOrEqual(12);
    expect(animation.duration).toBeLessThanOrEqual(20);
    // Constant speed, so nothing decelerates into a corner and reverses.
    expect(animation.easing).toBe('linear');
    // Already mid-lap on the first frame rather than parked at rest for
    // several seconds after load.
    expect(animation.delay).toBeLessThan(0);
    expect(animation.willChange).toBe('transform');
    expect(animation.state).toBe('running');

    // How far it actually moves while someone is reaching for it, measured as
    // path travelled rather than as start-to-end distance -- a lap that doubles
    // back would flatter itself on the latter. Sampled in the page so the reads
    // are 100ms apart rather than a round trip apart.
    const trace = await control.evaluate(
      (element) =>
        new Promise<{ arc: number; longestStep: number; stillFrames: number }>((resolve) => {
          const first = element.getBoundingClientRect();
          let previous = { x: first.x, y: first.y };
          let arc = 0;
          let longestStep = 0;
          let stillFrames = 0;
          let taken = 0;
          const tick = () => {
            const now = element.getBoundingClientRect();
            const step = Math.hypot(now.x - previous.x, now.y - previous.y);
            arc += step;
            longestStep = Math.max(longestStep, step);
            if (step === 0) stillFrames += 1;
            previous = { x: now.x, y: now.y };
            if ((taken += 1) >= 18) resolve({ arc, longestStep, stillFrames });
            else setTimeout(tick, 100);
          };
          setTimeout(tick, 100);
        }),
    );

    // ~4-6px a second, so roughly 7-11px over this 1.8s window. The floor is
    // the point: under the old keyframes this measured about 0.5px, which is
    // the arithmetic behind "very choppy and not at all fluid".
    expect(trace.arc, 'the drift is back to being too slow to read as motion').toBeGreaterThan(2.5);
    expect(trace.arc, 'the drift has become a chase').toBeLessThan(22);
    // And it is moving on every sample rather than holding a position and
    // jumping -- continuous motion, not steps.
    expect(trace.stillFrames, 'the control holds still and then jumps').toBe(0);
    expect(trace.longestStep, 'the control jumps rather than drifts').toBeLessThan(3);

    // Hovering pauses it outright, so it is stationary by the time a pointer
    // has arrived. `mouse.move` rather than `locator.hover()` on purpose:
    // hover() waits for the element to hold still first, which is the very
    // thing being tested.
    await page.mouse.move(centre.x, centre.y);
    await expect
      .poll(() => control.evaluate((element) => getComputedStyle(element).animationPlayState), {
        message: 'the control kept drifting under the pointer',
        timeout: 2000,
      })
      .toBe('paused');

    // And a raw click at the coordinates it occupied *before* the pointer got
    // there still lands on it. This is what makes a moving control hittable --
    // the pause, not a slow lap. No actionability waiting involved.
    await page.mouse.click(centre.x, centre.y);
    await expect(control).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('blue');
  });

  test('still renders, and still works, for a visitor who prefers reduced motion', async ({
    page,
  }) => {
    // The decorative dots are skipped entirely in this mode. These are
    // functionality, so only their motion goes.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    expect(await controlNames(page)).toEqual(ALL_CONTROLS);
    const animations = await page.$$eval('#landing [aria-pressed]', (nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName),
    );
    expect(animations).toEqual(animations.map(() => 'none'));

    await page.getByLabel('Red theme').click();
    await expect(page.getByLabel('Red theme')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('contrast, measured rather than eyeballed', () => {
  for (const themeName of ['dark', 'blue', 'light', 'red', 'purple', 'green']) {
    test(`${themeName}: every control reads against its own surface`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), themeName);
      await page.setViewportSize(DESKTOP);
      await gotoHome(page);

      const measurements = await page.evaluate(() => {
        const parse = (value: string) => {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const parts = match[1].split(',').map((piece) => parseFloat(piece));
          return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
        };
        type Rgba = { r: number; g: number; b: number; a: number };
        const over = (front: Rgba, back: Rgba): Rgba => ({
          r: front.r * front.a + back.r * (1 - front.a),
          g: front.g * front.a + back.g * (1 - front.a),
          b: front.b * front.a + back.b * (1 - front.a),
          a: 1,
        });
        const luminance = ({ r, g, b }: Rgba) => {
          const channel = (value: number) => {
            const scaled = value / 255;
            return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
        };
        const ratio = (a: Rgba, b: Rgba) => {
          const first = luminance(a);
          const second = luminance(b);
          return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
        };
        /**
         * The first fully opaque background at or above `element`, compositing
         * every translucent layer on the way up. This is the colour the eye
         * actually sees behind the pixel -- which for these controls must be
         * the control's own coin, never the hero's drifting blur circles.
         */
        const backdrop = (element: Element, includeSelf: boolean): Rgba => {
          const layers: Rgba[] = [];
          let node: Element | null = includeSelf ? element : element.parentElement;
          while (node) {
            const background = parse(getComputedStyle(node).backgroundColor);
            if (background && background.a > 0) {
              layers.push(background);
              if (background.a === 1) break;
            }
            node = node.parentElement;
          }
          let base: Rgba = { r: 255, g: 255, b: 255, a: 1 };
          for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
          return base;
        };

        return Array.from(document.querySelectorAll('#landing [aria-pressed]')).map((button) => {
          const coin = backdrop(button, true);
          const inner =
            button.querySelector('[aria-hidden="true"]') ??
            (button.querySelector('svg') as Element);
          const innerStyle = getComputedStyle(inner);
          const mark = parse(
            inner.tagName.toLowerCase() === 'svg' ? innerStyle.color : innerStyle.borderTopColor,
          );
          const rim = parse(getComputedStyle(button).borderTopColor);
          const focusRing = parse(getComputedStyle(button).outlineColor);
          return {
            name: button.getAttribute('aria-label'),
            coinIsOpaque: coin.a === 1,
            mark: mark ? ratio(over(mark, coin), coin) : 0,
            rim: rim ? ratio(over(rim, coin), coin) : 0,
            focusRing: focusRing ? ratio(over(focusRing, coin), coin) : 0,
          };
        });
      });

      expect(measurements).toHaveLength(8);
      for (const measurement of measurements) {
        // If this is ever false the whole argument collapses: the control's
        // parts would be measured against the hero's animated blur circles,
        // which are at randomised positions on every load.
        expect(measurement.coinIsOpaque, `${measurement.name} has no opaque surface`).toBe(true);
        // 3:1 is the WCAG 1.4.11 floor for a non-text control part; the swatch
        // rings and layout glyphs are held to the 4.5:1 text floor anyway
        // because they are the only thing distinguishing one control from
        // another.
        expect(measurement.mark, `${measurement.name}'s swatch/icon`).toBeGreaterThanOrEqual(4.5);
        expect(measurement.rim, `${measurement.name}'s outer rim`).toBeGreaterThanOrEqual(3);
        expect(
          measurement.focusRing,
          `${measurement.name}'s focus ring would be invisible when focused`,
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

test.describe('the hamburger it replaced', () => {
  test('is gone from the hero, and the drawer is still reachable everywhere else', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    // Nothing in the hero opens the settings drawer any more...
    await expect(page.locator('#landing [aria-label="Open Settings Drawer"]')).toHaveCount(0);
    // ...and the global NavBar's gear is hidden while the hero is on screen,
    // which is what made the hamburger the only trigger here in the first
    // place. (If this ever becomes visible, the hero has two triggers again.)
    await expect(page.locator('header [aria-label="Open Settings Drawer"]')).toBeHidden();

    // Once the hero's arrow has gone, the bar and its gear come back, and the
    // drawer still holds both pickers.
    await page.evaluate(() => window.scrollTo({ top: 3000, behavior: 'instant' }));
    await page.getByLabel('Open Settings Drawer').click();

    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    for (const label of ['Dark', 'Blue', 'Light', 'Red', 'Purple', 'Green']) {
      await expect(drawer.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(drawer.getByRole('button', { name: 'Top Nav' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Side Nav' })).toBeVisible();
  });
});
