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

  it('keeps Send focusable but aria-disabled on mount, before the user has typed anything (C1)', () => {
    render(<ConnectForm />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    // Native `disabled` would drop Send out of the tab sequence entirely, so
    // a keyboard user tabbing an empty form would never reach it. It must
    // stay focusable and only be marked aria-disabled.
    expect(
      sendButton,
      'Send must stay focusable (not natively disabled) even on an empty form',
    ).toBeEnabled();
    expect(
      sendButton,
      'Send should be marked aria-disabled while the form is empty',
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('shows no field errors on mount, before the user has typed anything (F4)', () => {
    render(<ConnectForm />);

    expect(
      screen.queryByText(/please fill out all required sections/i),
      'an untouched form should not show any field error',
    ).not.toBeInTheDocument();
  });

  it('shows the name field error only once the name field itself has been touched and left invalid (F4)', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    // Type into email only; name and message remain untouched and empty.
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com');

    expect(
      screen.queryByText(/please fill out all required sections \(name\)/i),
      "the name field's own error should stay hidden until the name field is touched",
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/name/i), 'A');
    await user.clear(screen.getByLabelText(/name/i));

    expect(
      screen.getByText(/please fill out all required sections \(name\)/i),
      'expected the name error once the name field has been touched and left blank',
    ).toBeInTheDocument();
  });

  it('shows the email format error on the email field once it is touched with a malformed value (F4)', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await user.type(screen.getByLabelText(/email/i), 'not-an-email');

    expect(
      screen.getByText(/please enter a valid email address/i),
      'expected the email-format error to attach to the email field once touched',
    ).toBeInTheDocument();
    // The other, still-untouched fields must not show an error.
    expect(
      screen.queryByText(/please fill out all required sections \(name\)/i),
      'the untouched name field must not show an error just because email is invalid',
    ).not.toBeInTheDocument();
  });

  it('reaches Send by keyboard alone on a completely empty form (C1)', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    // Tab through every field in order; Send must be reachable even though
    // the form is empty and invalid the whole way through.
    await user.tab(); // name
    await user.tab(); // email
    await user.tab(); // message
    await user.tab(); // Send (the honeypot is tabIndex={-1} and must be skipped)

    expect(
      screen.getByRole('button', { name: /send/i }),
      'Send must be reachable by keyboard alone even while the form is empty and invalid',
    ).toHaveFocus();
  });

  it('activating Send while invalid does not submit, reveals every field error (even untouched ones), and moves focus to the first invalid field (C1)', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(<ConnectForm />);

    // Fill only the name field; email and message stay blank and untouched.
    await user.type(screen.getByLabelText(/name/i), 'Alex');

    // Send stays focusable and clickable while aria-disabled -- that's the
    // whole point of the accessible-disable pattern -- so activate it the
    // same way a real user would, by clicking it.
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(
      fetchMock,
      'an invalid form must never reach the network -- aria-disabled communicates ' +
        'state, it does not replace the "cannot actually submit" guarantee',
    ).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/please fill out all required sections \(email\)/i),
      'expected the untouched email field error to appear after an attempted submit',
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/please fill out all required sections \(message\)/i),
      'expected the untouched message field error to appear after an attempted submit',
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/email/i),
      'expected focus to move to the first invalid field (email, since name is already filled)',
    ).toHaveFocus();
  });

  it('pressing Enter in a text field on an invalid form does not submit (native form-submit path, F5)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const { container } = render(<ConnectForm />);

    // Fill only the name field; email and message stay blank and untouched.
    await user.type(screen.getByLabelText(/name/i), 'Alex');

    const form = container.querySelector('form');
    expect(form, 'expected the form to render as a real <form> element (F5)').not.toBeNull();
    form?.requestSubmit
      ? form.requestSubmit()
      : form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(fetchMock, 'an invalid form must never reach the network').not.toHaveBeenCalled();
    expect(
      await screen.findByText(/please fill out all required sections \(email\)/i),
      'expected the untouched email field error to appear after an attempted submit',
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/please fill out all required sections \(message\)/i),
      'expected the untouched message field error to appear after an attempted submit',
    ).toBeInTheDocument();
  });

  it('keeps Send aria-disabled (but still focusable) while the form is only partially filled', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await user.type(screen.getByLabelText(/name/i), 'Alex');
    await user.type(screen.getByLabelText(/email/i), 'alex@example.com');
    // Message left empty.

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(
      sendButton,
      'Send must stay focusable even while the message field is still empty',
    ).toBeEnabled();
    expect(
      sendButton,
      'Send should stay aria-disabled when the message field is still empty',
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('keeps Send aria-disabled (but still focusable) while the email is present but malformed', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await user.type(screen.getByLabelText(/name/i), 'Alex');
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.type(screen.getByLabelText(/message/i), 'Hello there');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(
      sendButton,
      'Send must stay focusable even while the email fails format validation',
    ).toBeEnabled();
    expect(
      sendButton,
      'Send should stay aria-disabled while the email fails format validation',
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('enables Send (and clears aria-disabled) once name, email, and message are all valid', async () => {
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(
      sendButton,
      'Send should become enabled once every field is filled with valid data',
    ).toBeEnabled();
    expect(
      sendButton,
      'Send should no longer be aria-disabled once every field is valid',
    ).not.toHaveAttribute('aria-disabled');
  });

  it('renders a hidden honeypot input named "website" that is not reachable by keyboard or screen reader (F3)', () => {
    const { container } = render(<ConnectForm />);

    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot, 'expected a real input named "website"').not.toBeNull();
    expect(honeypot, 'the honeypot must be removed from the tab order').toHaveAttribute(
      'tabindex',
      '-1',
    );
    expect(honeypot, 'the honeypot must be hidden from assistive tech').toHaveAttribute(
      'aria-hidden',
      'true',
    );
    // The contract explicitly forbids display:none/hidden (bots skip those).
    expect(honeypot, 'the honeypot must not use display:none').not.toHaveStyle({ display: 'none' });
  });

  it('shows a loading state on Send while a submit is in flight and disables it against a double-submit (F1)', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );
    const user = userEvent.setup();
    render(<ConnectForm />);

    await fillValidForm(user);
    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(
      screen.getByRole('button', { name: /sending/i }),
      'expected the button to switch to a loading label while the request is in flight',
    ).toBeDisabled();

    resolveFetch({ ok: true } as Response);
    await waitFor(() => screen.getByRole('alert'));
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

  it.each([
    [400, /please check your details and try again/i],
    [413, /that message is too long/i],
    [429, /too many messages/i],
    [502, /couldn't send that/i],
  ])(
    'shows the status-specific failure copy for a %i response (F2)',
    async (status, expectedCopy) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status } as Response));
      const user = userEvent.setup();
      render(<ConnectForm />);

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /send/i }));

      const alert = await screen.findByRole('alert');
      expect(
        alert,
        `expected the ${status} mapping's copy, got: "${alert.textContent}"`,
      ).toHaveTextContent(expectedCopy);
    },
  );

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
    // this fix addresses: a failed submit must not clear the form.
    expect(screen.getByLabelText(/name/i), 'name should survive a failed submit').toHaveValue(
      'Alex',
    );
    expect(screen.getByLabelText(/email/i), 'email should survive a failed submit').toHaveValue(
      'alex@example.com',
    );
    expect(screen.getByLabelText(/message/i), 'message should survive a failed submit').toHaveValue(
      'Hello there, this is a test message.',
    );
  });

  it('submits via the form (Enter-equivalent native submit), not just a click handler (F5)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true } as Response));
    const user = userEvent.setup();
    const { container } = render(<ConnectForm />);

    await fillValidForm(user);

    const form = container.querySelector('form');
    expect(form, 'expected a real <form> element wrapping the inputs (F5)').not.toBeNull();

    // jsdom's requestSubmit runs native constraint validation, invokes the
    // form's submit event, and respects a disabled default submit button --
    // exactly the mechanism a real Enter key press relies on. Full
    // Enter-key browser verification is covered separately (see report).
    form?.requestSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert, 'expected a native form submit to reach the same success path').toHaveTextContent(
      /message sent successfully/i,
    );
  });
});
