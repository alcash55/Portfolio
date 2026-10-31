import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analytics } from '~/lib/analytics';
import { ContactForm } from './ContactForm';

vi.mock('~/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/lib/analytics')>()),
  analytics: { enabled: true, queued: 0, start: vi.fn(), capture: vi.fn(), pageview: vi.fn() },
}));

async function submit(status: number) {
  const fetchStub = vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response('{}', { status, headers: { 'Content-Type': 'application/json' } }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ContactForm deps={{ fetch: fetchStub, apiUrl: 'https://api.test' }} />
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: /^Name/ }), 'Ada Lovelace');
  await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'ada@example.com');
  await user.type(screen.getByRole('textbox', { name: /^Message/ }), 'Hello there.');
  await user.click(screen.getByRole('button', { name: 'Send message' }));
  return fetchStub;
}

describe('ContactForm analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a submission after the API accepts it', async () => {
    await submit(200);

    await screen.findByRole('heading', { name: 'Message sent.' });
    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith('contact_submitted');
  });

  it('records nothing when the API refuses the message', async () => {
    const fetchStub = await submit(500);

    await waitFor(() => expect(fetchStub).toHaveBeenCalled());
    await screen.findByText("Couldn't send that. Try again in a minute.");
    expect(analytics.capture).not.toHaveBeenCalled();
  });

  it('records nothing for a form that fails validation', async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ContactForm deps={{ fetch: vi.fn<typeof fetch>(), apiUrl: 'https://api.test' }} />
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
