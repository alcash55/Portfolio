import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import ToggleColorMode from './Context';
import { ColorModeContext } from './ColorModeContext';

/**
 * `color-scheme` and `theme-color` describe UI the page cannot style itself --
 * scrollbars, native form controls, and the mobile browser's own chrome. Both
 * were hardcoded to the dark theme's values in `index.html`, so a visitor on
 * the light theme got dark scrollbars and dark form controls on a white page.
 * These assert the tags actually track the active theme, which is the only way
 * to see it without opening a browser: nothing in the rendered tree changes.
 */
const meta = (name: string) =>
  document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;

/** Switches theme through the real context, the way ThemeButton does. */
const Switcher = () => {
  const { toggleColorMode, themeName } = useContext(ColorModeContext);
  return (
    <>
      <span data-testid="active">{themeName}</span>
      <button onClick={() => toggleColorMode('light')}>light</button>
      <button onClick={() => toggleColorMode('purple')}>purple</button>
    </>
  );
};

describe('ToggleColorMode browser-chrome meta tags', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head
      .querySelectorAll('meta[name="color-scheme"], meta[name="theme-color"]')
      .forEach((n) => n.remove());
  });

  it('writes the dark theme values on mount for a first-time visitor', () => {
    render(
      <ToggleColorMode>
        <Switcher />
      </ToggleColorMode>,
    );

    expect(screen.getByTestId('active')).toHaveTextContent('dark');
    expect(meta('color-scheme'), 'the default theme is dark').toBe('dark');
    expect(meta('theme-color')).toBe('#202020');
  });

  it('writes light values on mount when the visitor already saved the light theme', () => {
    localStorage.setItem('theme', 'light');

    render(
      <ToggleColorMode>
        <Switcher />
      </ToggleColorMode>,
    );

    expect(
      meta('color-scheme'),
      'a saved light theme must not leave the browser painting dark chrome',
    ).toBe('light');
    expect(meta('theme-color')).toBe('#f4f5f7');
  });

  it('follows a theme change in both directions', async () => {
    const user = userEvent.setup();
    render(
      <ToggleColorMode>
        <Switcher />
      </ToggleColorMode>,
    );

    await user.click(screen.getByRole('button', { name: 'light' }));
    expect(meta('color-scheme')).toBe('light');
    expect(meta('theme-color')).toBe('#f4f5f7');

    // Purple is one of the five dark themes: the scheme goes back to dark, and
    // theme-color takes purple's own background rather than a shared near-black.
    await user.click(screen.getByRole('button', { name: 'purple' }));
    expect(meta('color-scheme')).toBe('dark');
    expect(meta('theme-color'), 'each dark theme has its own background').toBeTruthy();
    expect(meta('theme-color')).not.toBe('#f4f5f7');
  });

  it('creates the tags when the document has none, rather than silently doing nothing', () => {
    expect(document.querySelector('meta[name="color-scheme"]')).toBeNull();

    render(
      <ToggleColorMode>
        <Switcher />
      </ToggleColorMode>,
    );

    expect(document.querySelector('meta[name="color-scheme"]')).not.toBeNull();
    expect(document.querySelector('meta[name="theme-color"]')).not.toBeNull();
  });
});
