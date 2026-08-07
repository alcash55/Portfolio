import { ThemeProvider } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Landing from './Landing';
import { lightTheme } from '../../../layout/Theme/lightTheme';
import { darkTheme } from '../../../layout/Theme/darkTheme';

/**
 * Regression coverage for Sprint 12's H1/H2: Alex's headline bug was "the
 * light theme does not change the colors on the home section," caused by 15
 * hardcoded `rgba(255,255,255,…)`/`#fff` references plus a `background.hero`
 * token pinned dark in every theme. These lock in that the hero's background
 * and text now both follow the active theme instead of a fixed dark value.
 */
describe('Landing hero follows the active theme (Sprint 12 H1)', () => {
  it('renders without a ThemeProvider (falls back to MUI defaults)', () => {
    render(<Landing />);
    expect(screen.getByText('Alex Cash')).toBeInTheDocument();
  });

  it('resolves a light hero background under the light theme', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const hero = document.getElementById('landing');
    expect(hero).not.toBeNull();
    // lightTheme's background.default (#f4f5f7) -- was hardcoded to a fixed
    // dark value (#202020) for every theme before this sprint.
    expect(getComputedStyle(hero as HTMLElement).backgroundColor).toBe('rgb(244, 245, 247)');
  });

  it('resolves a dark hero background under the dark theme', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const hero = document.getElementById('landing');
    expect(getComputedStyle(hero as HTMLElement).backgroundColor).toBe('rgb(32, 32, 32)');
  });

  it('never renders the hero caption in literal opaque white (guards the bug: white text on a light hero)', () => {
    render(
      <ThemeProvider theme={lightTheme}>
        <Landing />
      </ThemeProvider>,
    );
    const caption = screen.getByText('Software Engineer');
    expect(getComputedStyle(caption).color).not.toBe('rgb(255, 255, 255)');
  });
});
