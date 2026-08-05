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

  it('shows no validation error banner on mount, before the user has typed anything (F3)', () => {
    render(<ConnectForm />);

    expect(
      screen.queryByText(/please fill out all required sections/i),
      'an untouched form should not show a validation error banner',
    ).not.toBeInTheDocument();
  });

  it('shows the validation error banner once the user types into a field and leaves it invalid (F3)', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    // Type into name only; email and message are still missing, so the form
    // remains invalid, but the user has now interacted with it.
    await user.type(screen.getByLabelText(/name/i), 'Alex');

    expect(
      screen.getByText(/please fill out all required sections/i),
      'expected the error banner to appear once the user has touched an invalid form',
    ).toBeInTheDocument();
  });

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

  it('form fields clear after a successful submit (F2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => screen.getByRole('alert'));

    expect(
      screen.getByLabelText(/name/i),
      'name should be cleared after a successful submit',
    ).toHaveValue('');
    expect(
      screen.getByLabelText(/email/i),
      'email should be cleared after a successful submit',
    ).toHaveValue('');
    expect(
      screen.getByLabelText(/message/i),
      'message should be cleared after a successful submit',
    ).toHaveValue('');
  });

  it('form fields retain their values after a failed submit (F2)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 } as Response));
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => screen.getByRole('alert'));

    // Losing typed text because the API was cold is a worse bug than the one
    // this fix addresses — a failed submit must not clear the form.
    expect(
      screen.getByLabelText(/name/i),
      'name should survive a failed submit',
    ).toHaveValue('Alex');
    expect(
      screen.getByLabelText(/email/i),
      'email should survive a failed submit',
    ).toHaveValue('alex@example.com');
    expect(
      screen.getByLabelText(/message/i),
      'message should survive a failed submit',
    ).toHaveValue('Hello there, this is a test message.');
  });
});
