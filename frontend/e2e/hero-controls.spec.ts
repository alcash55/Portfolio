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
      controls: Array.from(document.querySelectorAll('#landing [aria-pressed]')).map((element) => {
        const box = element.getBoundingClientRect();
        return {
          name: element.getAttribute('aria-label') ?? '?',
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
        return found;
      })(),
      viewportWidth: window.innerWidth,
      heroBottom: (document.getElementById('landing') as HTMLElement).getBoundingClientRect()
        .bottom,
    });

  // Drift is +-6px from the resting position, so every control is checked with
  // that much slack in each direction: a control that only clears the text at
  // rest is a control that lands on it three seconds later.
  const DRIFT = 7;

  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    DESKTOP,
    { width: 1024, height: 768 },
    NARROW_DESKTOP,
    { width: 768, height: 1024 },
    { width: 700, height: 700 },
    MOBILE,
    TINY,
  ]) {
    test(`nothing is covered, and nothing overflows, at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await gotoHome(page);

      const { controls, obstacles, viewportWidth, heroBottom } = await page.evaluate(geometry);

      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) {
        for (const obstacle of obstacles) {
          const overlapping =
            control.x - DRIFT < obstacle.right &&
            control.right + DRIFT > obstacle.x &&
            control.y - DRIFT < obstacle.bottom &&
            control.bottom + DRIFT > obstacle.y;
          expect(
            overlapping,
            `${control.name} [${Math.round(control.x)},${Math.round(control.y)} ` +
              `${Math.round(control.right)},${Math.round(control.bottom)}] sits on top of ` +
              `${obstacle.kind} [${Math.round(obstacle.x)},${Math.round(obstacle.y)} ` +
              `${Math.round(obstacle.right)},${Math.round(obstacle.bottom)}]`,
          ).toBe(false);
        }
        // A control that hangs off the right edge is both unreachable and a
        // source of the horizontal scrollbar `smoke.spec.ts` forbids.
        expect(
          control.right + DRIFT,
          `${control.name} hangs off the right edge`,
        ).toBeLessThanOrEqual(viewportWidth);
        expect(control.x - DRIFT, `${control.name} hangs off the left edge`).toBeGreaterThanOrEqual(
          0,
        );
        // The hero clips its own overflow, so a control below its bottom edge
        // is simply invisible.
        expect(
          control.bottom + DRIFT,
          `${control.name} is clipped by the hero`,
        ).toBeLessThanOrEqual(heroBottom);
      }
    });
  }
});

test.describe('a moving target', () => {
  test('drifts slowly, stops under the pointer, and can still be clicked while moving', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await gotoHome(page);

    const control = page.getByLabel('Blue theme');
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    const centre = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };

    // It is animating, on its own keyframes rather than the decorative field's
    // `float` (which throws a dot 30px around in as little as five seconds).
    const animation = await control.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        name: style.animationName,
        duration: parseFloat(style.animationDuration),
        state: style.animationPlayState,
      };
    });
    expect(animation.name).toBe('heroControlDrift');
    expect(animation.name).not.toBe('float');
    expect(animation.duration).toBeGreaterThanOrEqual(20);
    expect(animation.state).toBe('running');

    // How far it actually travels while someone is reaching for it. Anything
    // approaching the button's own size would make it a chase.
    const before = await control.boundingBox();
    await page.waitForTimeout(1500);
    const after = await control.boundingBox();
    const travelled = Math.hypot(after!.x - before!.x, after!.y - before!.y);
    expect(travelled, 'the drift is too fast to aim at').toBeLessThan(3);

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
    // there still lands on it -- the real test of whether the drift is small
    // enough. No actionability waiting involved.
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
