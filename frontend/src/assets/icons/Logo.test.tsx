import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { darkTheme } from '../../layout/Theme/darkTheme';
import { blueTheme } from '../../layout/Theme/blueTheme';
import { lightTheme } from '../../layout/Theme/lightTheme';
import { Logo } from './Logo';

/**
 * The monogram must follow the theme. The asset it replaced (`Logo.svg`)
 * hardcoded a black fill and could only ever sit on one background, which is
 * exactly the failure a light theme exposes -- and this project has one.
 *
 * These assert the *mechanism* (strokes resolve via `currentColor`, so the
 * mark inherits whatever colour its context sets) rather than specific hex
 * values, so re-styling a theme doesn't break the test while genuinely
 * hardcoding a colour does.
 */
describe('Logo', () => {
  const themes = [
    { name: 'dark', theme: darkTheme },
    { name: 'blue', theme: blueTheme },
    { name: 'light', theme: lightTheme },
  ];

  it.each(themes)('renders in the $name theme without hardcoding a colour', ({ theme }) => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Logo titleAccess="Alex Cash" />
      </ThemeProvider>,
    );

    const strokedPaths = [...container.querySelectorAll('path')];
    expect(
      strokedPaths.length,
      'expected the monogram to render its stroked paths',
    ).toBeGreaterThan(0);

    strokedPaths.forEach((path) => {
      expect(
        path.getAttribute('stroke'),
        `every path must stroke with currentColor so it follows the theme; got ${path.getAttribute('stroke')}`,
      ).toBe('currentColor');
      expect(
        path.getAttribute('fill'),
        'paths must not fill -- a filled monogram cannot invert for a light theme',
      ).toBe('none');
    });
  });

  it('inherits the colour of its context rather than setting its own', () => {
    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <span style={{ color: 'rgb(1, 2, 3)' }}>
          <Logo />
        </span>
      </ThemeProvider>,
    );

    const svg = container.querySelector('svg');
    expect(svg, 'expected an svg root').not.toBeNull();
    // MUI's SvgIcon sets `fill: currentColor` and no explicit colour of its
    // own, so the computed colour must come from the surrounding context.
    expect(
      getComputedStyle(svg as SVGSVGElement).color,
      'the monogram set its own colour instead of inheriting the surrounding one',
    ).toBe('rgb(1, 2, 3)');
  });

  it('exposes an accessible name when one is given', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <Logo titleAccess="Alex Cash" />
      </ThemeProvider>,
    );
    expect(
      screen.getByTitle('Alex Cash'),
      'titleAccess should surface a title element for assistive tech',
    ).toBeInTheDocument();
  });
});
