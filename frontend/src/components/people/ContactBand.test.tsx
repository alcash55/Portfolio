import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactBand } from './ContactBand';
import { renderInRouter } from './renderInRouter';

async function setup() {
  const client = new QueryClient();
  await renderInRouter(
    <QueryClientProvider client={client}>
      <ContactBand />
    </QueryClientProvider>,
  );
  return screen.getByRole('region', { name: 'Say hi.' });
}

describe('ContactBand', () => {
  it('is chapter 13 with the Say hi heading and the one-line invitation', async () => {
    const band = await setup();
    expect(band).toHaveAttribute('id', 'contact');
    expect(band).toHaveAttribute('data-ch', '13');
    expect(within(band).getByRole('heading', { level: 2, name: 'Say hi.' })).toBeInTheDocument();
    expect(within(band).getByText('Send me a message here.')).toBeInTheDocument();
  });

  it('puts the form before the fold and leaves out the dogs and the link row', async () => {
    const band = await setup();
    expect(within(band).queryByRole('figure')).not.toBeInTheDocument();
    expect(within(band).queryByRole('img')).not.toBeInTheDocument();
    expect(within(band).queryByRole('link', { name: /^LinkedIn/ })).not.toBeInTheDocument();
    expect(within(band).queryByRole('link', { name: /^View resume/ })).not.toBeInTheDocument();
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
