import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '~/components/people/renderInRouter';
import { ResumePage } from '~/components/people/ResumePage';
import { ContentPage } from './ContentPage';
import { NotFoundRoute } from './NotFound';

// The shell moves focus to the page's h1 after a client-side navigation. A heading
// without tabindex cannot take focus, so the call does nothing and focus stays on
// the link that was clicked.
describe('page headings the shell focuses on arrival', () => {
  it.each([
    ['the resume page', <ResumePage key="resume" />],
    [
      'a project page',
      <ContentPage key="content" h1="Clipper" back={{ label: 'All projects', hash: 'projects' }} />,
    ],
    ['the not found page', <NotFoundRoute key="nf" />],
  ])('%s has an h1 that can take focus', async (_name, ui) => {
    await renderInRouter(ui);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveAttribute('tabindex', '-1');
    h1.focus();
    expect(h1).toHaveFocus();
  });
});
