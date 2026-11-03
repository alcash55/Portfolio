import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from './ContactForm';

function tree(fetchStub: typeof fetch) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <ContactForm deps={{ fetch: fetchStub, apiUrl: 'https://api.test' }} />
    </QueryClientProvider>
  );
}

describe('ContactForm before React owns the form', () => {
  let host: HTMLElement | null = null;
  afterEach(() => {
    host?.remove();
    host = null;
  });

  it('ships the server HTML with Send disabled and the fields read-only', () => {
    // A native POST from this HTML reaches the page URL, not the API, and drops the
    // message. The form must not be submittable until React owns it.
    host = document.createElement('div');
    host.innerHTML = renderToString(tree(vi.fn<typeof fetch>()));
    document.body.append(host);

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    for (const name of [/^Name/, /^Email/, /^Message/]) {
      expect(screen.getByRole('textbox', { name })).toHaveAttribute('readonly');
    }
  });

  it('sends what the DOM holds when React state is still empty', async () => {
    // Autofill and early typing can fill a field without a change event React saw.
    const stub = vi.fn<typeof fetch>(async () => new Response('{}', { status: 200 }));
    render(tree(stub));
    const typed = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there.' };
    screen.getByRole<HTMLInputElement>('textbox', { name: /^Name/ }).value = typed.name;
    screen.getByRole<HTMLInputElement>('textbox', { name: /^Email/ }).value = typed.email;
    screen.getByRole<HTMLTextAreaElement>('textbox', { name: /^Message/ }).value = typed.message;

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(stub).toHaveBeenCalledTimes(1));
    const [, init] = stub.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({ ...typed, website: '' });
    expect(screen.queryByText('Check these fields before sending.')).not.toBeInTheDocument();
  });
});
