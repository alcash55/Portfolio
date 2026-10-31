import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderInRouter } from '~/components/people/renderInRouter';
import { ContactPage } from './ContactPage';

async function setup(resume: Parameters<typeof ContactPage>[0]['resume'] = { available: false }) {
  await renderInRouter(
    <QueryClientProvider client={new QueryClient()}>
      <ContactPage resume={resume} />
    </QueryClientProvider>,
  );
}

describe('ContactPage', () => {
  it('has one h1, an intro and the printed address as a mailto link', async () => {
    await setup();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Get in touch.' })).toBeInTheDocument();
    expect(
      screen.getByText("Let's work together. Email is the most direct way to reach me."),
    ).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'alex.e.cash28@gmail.com' });
    for (const link of links) {
      expect(link).toHaveAttribute('href', 'mailto:alex.e.cash28@gmail.com');
    }
    expect(links.length).toBeGreaterThan(0);
  });

  it('has a Message Alex link to the form, a form heading and the form', async () => {
    await setup();
    const cta = screen.getByRole('link', { name: 'Message Alex (goes to the contact form)' });
    expect(cta).toHaveAttribute('href', '#message');
    const heading = screen.getByRole('heading', { level: 2, name: 'Send a message' });
    expect(heading).toHaveAttribute('id', 'message');
    expect(
      screen.getByText(
        'The form needs the API, which can take a minute to wake. Email works either way.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Message Alex' })).toBeInTheDocument();
  });

  it('moves focus to the Name field when the visitor follows Message Alex', async () => {
    await setup();
    await userEvent.click(
      screen.getByRole('link', { name: 'Message Alex (goes to the contact form)' }),
    );
    expect(screen.getByRole('textbox', { name: /^Name/ })).toHaveFocus();
  });

  it('lists LinkedIn, GitHub and the resume', async () => {
    await setup({ available: true, bytes: 23326 });
    const links = within(screen.getByRole('navigation', { name: 'Elsewhere' }));
    expect(links.getByRole('link', { name: 'LinkedIn (opens in a new tab)' })).toBeInTheDocument();
    expect(links.getByRole('link', { name: 'GitHub (opens in a new tab)' })).toBeInTheDocument();
    expect(
      links.getByRole('link', { name: 'View resume (PDF, 23 KB, opens in a new tab)' }),
    ).toBeInTheDocument();
  });
});
