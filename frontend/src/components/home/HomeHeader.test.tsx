import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderShell } from '~/test/renderShell';

describe('header on the home route', () => {
  it('shows the chapter counter between the mark and the nav, and keeps the nav', async () => {
    await renderShell('/');
    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('button', { name: /^Chapter 1 of 12, About me/ }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole('navigation', { name: 'Primary', hidden: true }),
    ).toBeInTheDocument();
    expect(header.querySelector('.prog')).not.toBeNull();
  });

  it('leaves other routes without a counter', async () => {
    await renderShell('/projects/clipper');
    expect(screen.queryByRole('button', { name: /^Chapter \d+ of 12/ })).toBeNull();
    expect(screen.getByRole('banner').querySelector('.prog')).toBeNull();
  });
});
