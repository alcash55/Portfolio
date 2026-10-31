import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactForm } from './ContactForm';

const EMAIL = 'alex.e.cash28@gmail.com';

type Stub = ReturnType<typeof vi.fn<typeof fetch>>;

function reply(status: number): Response {
  return new Response('{}', { status, headers: { 'Content-Type': 'application/json' } });
}

function setup(fetchStub: Stub) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
  render(
    <QueryClientProvider client={client}>
      <ContactForm deps={{ fetch: fetchStub, apiUrl: 'https://api.test' }} />
    </QueryClientProvider>,
  );
  return { user };
}

const field = {
  name: () => screen.getByRole('textbox', { name: /^Name/ }),
  email: () => screen.getByRole('textbox', { name: /^Email/ }),
  message: () => screen.getByRole('textbox', { name: /^Message/ }),
  send: () => screen.getByRole('button', { name: /^(Send message|Sending|Try again)$/ }),
};

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field.name(), 'Ada Lovelace');
  await user.type(field.email(), 'ada@example.com');
  await user.type(field.message(), 'Hello there.');
}

describe('ContactForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows three labelled required fields, a hint, a counter and the fallback address', () => {
    setup(vi.fn<typeof fetch>());

    expect(screen.getByRole('form', { name: 'Message Alex' })).toBeInTheDocument();
    expect(screen.getByText('All fields are required.')).toBeInTheDocument();
    expect(field.name()).toBeRequired();
    expect(field.email()).toBeRequired();
    expect(field.message()).toBeRequired();
    expect(screen.getByText('0 of 1500')).toBeInTheDocument();
    expect(field.send()).toHaveTextContent('Send message');
    expect(screen.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  });

  it('counts the message as the visitor types', async () => {
    const { user } = setup(vi.fn<typeof fetch>());
    await user.type(field.message(), 'Hello');
    expect(screen.getByText('5 of 1500')).toBeInTheDocument();
  });

  it('shows no error while typing, then names the problem when the field loses focus', async () => {
    const { user } = setup(vi.fn<typeof fetch>());

    await user.type(field.email(), 'ada@');
    expect(field.email()).not.toHaveAttribute('aria-invalid');

    await user.tab();
    expect(field.email()).toHaveAttribute('aria-invalid', 'true');
    expect(field.email()).toHaveAccessibleDescription(
      'Enter a valid email address, such as name@example.com.',
    );
    expect(
      screen.queryByRole('heading', { name: 'Check these fields before sending.' }),
    ).not.toBeInTheDocument();
  });

  it('clears a field error once the visitor fixes the value', async () => {
    const { user } = setup(vi.fn<typeof fetch>());
    await user.click(field.name());
    await user.tab();
    expect(field.name()).toHaveAttribute('aria-invalid', 'true');

    await user.type(field.name(), 'Ada');
    expect(field.name()).not.toHaveAttribute('aria-invalid');
  });

  it('on a bad submit sends nothing, lists every problem and moves focus to the summary', async () => {
    const fetchStub = vi.fn<typeof fetch>();
    const { user } = setup(fetchStub);

    await user.click(field.send());

    const summary = screen.getByRole('heading', { name: 'Check these fields before sending.' });
    expect(summary).toHaveFocus();
    const list = within(summary.parentElement as HTMLElement);
    expect(list.getByRole('link', { name: 'Enter your name.' })).toBeInTheDocument();
    expect(list.getByRole('link', { name: 'Enter your email address.' })).toBeInTheDocument();
    expect(list.getByRole('link', { name: 'Enter a message.' })).toBeInTheDocument();
    expect(fetchStub).not.toHaveBeenCalled();

    await user.click(list.getByRole('link', { name: 'Enter your email address.' }));
    expect(field.email()).toHaveFocus();
  });

  it('posts the message, shows progress, then moves focus to the sent heading', async () => {
    let resolve: (r: Response) => void = () => undefined;
    const fetchStub = vi.fn<typeof fetch>(() => new Promise<Response>((r) => (resolve = r)));
    const { user } = setup(fetchStub);
    await fillValid(user);

    await user.click(field.send());

    expect(fetchStub).toHaveBeenCalledTimes(1);
    const [url, init] = fetchStub.mock.calls[0] ?? [];
    expect(url).toBe('https://api.test/api/v1/contact');
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there.',
      website: '',
    });
    const sending = screen.getByRole('button', { name: 'Sending' });
    expect(sending).toHaveAttribute('aria-disabled', 'true');
    expect(field.name()).toHaveAttribute('readonly');

    // A second press while the first is in flight does nothing.
    await user.click(sending);
    expect(fetchStub).toHaveBeenCalledTimes(1);

    await act(async () => resolve(reply(200)));

    const heading = await screen.findByRole('heading', { name: 'Message sent.' });
    expect(heading).toHaveFocus();
    expect(screen.getByText('Thanks for writing. I will reply to ada@example.com.')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /^Name/ })).not.toBeInTheDocument();
  });

  it('returns to an empty form with focus on Name after "Send another message"', async () => {
    const { user } = setup(vi.fn<typeof fetch>().mockResolvedValue(reply(200)));
    await fillValid(user);
    await user.click(field.send());
    await user.click(await screen.findByRole('button', { name: 'Send another message' }));

    expect(field.name()).toHaveValue('');
    expect(field.name()).toHaveFocus();
    expect(screen.getByText('0 of 1500')).toBeInTheDocument();
  });

  it('says the server is waking after 4 seconds and offers the address', async () => {
    const fetchStub = vi.fn<typeof fetch>(() => new Promise<Response>(() => undefined));
    const { user } = setup(fetchStub);
    await fillValid(user);
    await user.click(field.send());

    const status = screen.getByRole('status', { name: 'Send status' });
    expect(status).toBeEmptyDOMElement();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(status).toBeEmptyDOMElement();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });
    expect(status).toHaveTextContent('Waking the server. This can take up to a minute.');
    expect(within(status).getByRole('link', { name: EMAIL })).toBeInTheDocument();
  });

  it.each([
    [429, 'Too many messages. Wait a moment and try again.', 'Send message'],
    [400, 'Please check your details and try again.', 'Send message'],
    [502, "Couldn't send that. Try again in a minute.", 'Try again'],
  ])(
    'on HTTP %i shows an alert, keeps the typing and offers the address',
    async (status, copy, label) => {
      const { user } = setup(vi.fn<typeof fetch>().mockResolvedValue(reply(status)));
      await fillValid(user);
      await user.click(field.send());

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(copy);
      expect(within(alert).getByRole('link', { name: EMAIL })).toHaveAttribute(
        'href',
        `mailto:${EMAIL}`,
      );
      expect(field.name()).toHaveValue('Ada Lovelace');
      expect(field.message()).toHaveValue('Hello there.');
      expect(field.send()).toHaveTextContent(label);
      expect(field.send()).not.toHaveAttribute('aria-disabled', 'true');
    },
  );

  it('after a server error says the message is kept, and "Try again" sends it once more', async () => {
    const fetchStub = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(reply(502))
      .mockResolvedValueOnce(reply(200));
    const { user } = setup(fetchStub);
    await fillValid(user);
    await user.click(field.send());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your message is still in the form.',
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Message sent.' })).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it('lets a visitor paste past the limit, shows the count over it, and refuses to send', async () => {
    const fetchStub = vi.fn<typeof fetch>();
    const { user } = setup(fetchStub);
    await user.type(field.name(), 'Ada');
    await user.type(field.email(), 'ada@example.com');
    await user.click(field.message());
    await user.paste('x'.repeat(1501));

    expect(screen.getByText('1501 of 1500')).toBeInTheDocument();
    await user.click(field.send());

    expect(
      screen.getAllByText('That message is too long. The limit is 1500 characters.').length,
    ).toBeGreaterThan(0);
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('carries a hidden honeypot that people cannot reach', () => {
    setup(vi.fn<typeof fetch>());
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(trap).not.toBeNull();
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(trap?.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('forwards whatever a bot typed into the honeypot', async () => {
    const fetchStub = vi.fn<typeof fetch>().mockResolvedValue(reply(200));
    const { user } = setup(fetchStub);
    await fillValid(user);
    const trap = document.querySelector<HTMLInputElement>('input[name="website"]');
    if (!trap) throw new Error('honeypot missing');
    await user.type(trap, 'spam.example');
    await user.click(field.send());

    await waitFor(() => expect(fetchStub).toHaveBeenCalled());
    expect(JSON.parse(String(fetchStub.mock.calls[0]?.[1]?.body))).toMatchObject({
      website: 'spam.example',
    });
  });
});
