import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactBand } from './ContactBand';
import { renderInRouter } from './renderInRouter';

async function setup(resume: Parameters<typeof ContactBand>[0]['resume'] = { available: false }) {
  const client = new QueryClient();
  await renderInRouter(
    <QueryClientProvider client={client}>
      <ContactBand resume={resume} />
    </QueryClientProvider>,
  );
  return screen.getByRole('region', { name: 'Say hi.' });
}

describe('ContactBand', () => {
  it('is chapter 12 with the Say hi heading and the one-line invitation', async () => {
    const band = await setup();
    expect(band).toHaveAttribute('id', 'contact');
    expect(band).toHaveAttribute('data-ch', '12');
    expect(within(band).getByRole('heading', { level: 2, name: 'Say hi.' })).toBeInTheDocument();
    expect(
      within(band).getByText("Let's work together. Send me a message here."),
    ).toBeInTheDocument();
  });

  it('opens LinkedIn and GitHub in a new tab and says so in the name', async () => {
    const band = await setup();
    const linkedin = within(band).getByRole('link', { name: 'LinkedIn (opens in a new tab)' });
    expect(linkedin).toHaveAttribute('href', 'https://www.linkedin.com/in/alexander-cash/');
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', 'noopener');
    const github = within(band).getByRole('link', { name: 'GitHub (opens in a new tab)' });
    expect(github).toHaveAttribute('href', 'https://github.com/alcash55');
  });

  it('links the resume with its size when the file exists', async () => {
    const band = await setup({ available: true, bytes: 23326 });
    expect(
      within(band).getByRole('link', { name: 'View resume (PDF, 23 KB, opens in a new tab)' }),
    ).toHaveAttribute('href', '/resume');
  });

  it('holds the message form and the fallback address', async () => {
    const band = await setup();
    expect(within(band).getByRole('form', { name: 'Message Alex' })).toBeInTheDocument();
    expect(within(band).getByRole('link', { name: 'alex.e.cash28@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:alex.e.cash28@gmail.com',
    );
  });
});
