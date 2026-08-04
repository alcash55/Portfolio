import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ConnectForm from './ConnectForm';

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/name/i), 'Alex');
  await user.type(screen.getByLabelText(/email/i), 'alex@example.com');
  await user.type(screen.getByLabelText(/message/i), 'Hello there, this is a test message.');
};

describe('ConnectForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('disables Send on mount, before the user has typed anything', () => {
    render(<ConnectForm />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(
      sendButton,
      'Send should be disabled on an empty, untouched form',
    ).toBeDisabled();
  });

  it(
    'KNOWN ISSUE (Sprint 3): validation error text is visible before the user has ' +
      'typed anything, because formErrors is derived from empty initial state on ' +
      'first render. Documented here as current behavior, not fixed this sprint.',
    () => {
      render(<ConnectForm />);

      expect(
        screen.getByText(/please fill out all required sections/i),
        'expected the current (undesirable) behavior: an error is shown immediately, ' +
          'before any user interaction',
      ).toBeInTheDocument();
    },
  );

  it('keeps Send disabled while the form is only partially filled', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await user.type(screen.getByLabelText(/name/i), 'Alex');
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com');
    // Message left empty.

    expect(
      screen.getByRole('button', { name: /send/i }),
      'Send should stay disabled when the message field is still empty',
    ).toBeDisabled();
  });

  it('keeps Send disabled while the email is present but malformed', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await user.type(screen.getByLabelText(/name/i), 'Alex');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/message/i), 'Hello there');

    expect(
      screen.getByRole('button', { name: /send/i }),
      'Send should stay disabled while the email fails format validation',
    ).toBeDisabled();
  });

  it('enables Send once name, email, and message are all valid', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);

    expect(
      screen.getByRole('button', { name: /send/i }),
      'Send should become enabled once every field is filled with valid data',
    ).toBeEnabled();
  });

  it('shows a success notification after a successful submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send/i }));

    const alert = await screen.findByRole('alert');
    expect(
      alert,
      `expected a success notification after an ok response, got: "${alert.textContent}"`,
    ).toHaveTextContent(/message sent successfully/i);
  });

  it('shows a failure notification after a failed submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 } as Response));
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send/i }));

    const alert = await screen.findByRole('alert');
    expect(
      alert,
      `expected a failure notification after a non-ok response, got: "${alert.textContent}"`,
    ).toHaveTextContent(/unable to send message/i);
  });

  // KNOWN ISSUE (Sprint 3): the TextFields are uncontrolled (no `value` prop bound
  // to the hook's name/email/message state), so nothing ever resets them after a
  // successful submit. Written against current behavior per Decision 4 — do not fix.
  it.skip(
    'KNOWN ISSUE: form fields do NOT clear after a successful submit (uncontrolled inputs)',
    async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
      const user = userEvent.setup();
      render(<ConnectForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => screen.getByRole('alert'));

      // This is what a user would expect and is NOT what happens today — the
      // inputs are uncontrolled, so their DOM value survives the submit even
      // though the hook's `name`/`email`/`message` state was never reset either.
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    },
  );
});
