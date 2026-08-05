import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useConnectForm from './useConnectForm';

describe('useConnectForm', () => {
  describe('validateForm', () => {
    // Priority order matters: the hook returns the *first* failing check, so a
    // caller only ever sees one error at a time. Pin that order down explicitly
    // rather than just checking "returns something truthy".
    it.each([
      ['', 'x@y.com', 'hello', 'name'],
      ['Alex', '', 'hello', 'email'],
      ['Alex', 'x@y.com', '', 'message'],
      ['Alex', 'not-an-email', 'hello', 'invalid email'],
    ])(
      // 4 values in each row (name, email, message, expectedField) -> 4 placeholders,
      // consumed positionally in that order. Do not add a 5th placeholder here: it.each
      // only interpolates what it's given, and an extra %s silently prints "undefined"
      // instead of erroring, which would make every test title lie about its inputs.
      'name=%j, email=%j, message=%j reports the %s error',
      (name, email, message, expectedField) => {
        const { result } = renderHook(() => useConnectForm());

        act(() => {
          result.current.setName(name);
          result.current.setEmail(email);
          result.current.setMessage(message);
        });

        const error = result.current.validateForm(name, email, message);

        expect(
          error,
          `validateForm(${JSON.stringify(name)}, ${JSON.stringify(email)}, ${JSON.stringify(
            message,
          )}) should report the ${expectedField} problem, got: ${JSON.stringify(error)}`,
        ).not.toBe('');
      },
    );

    it('checks fields in the order name -> email -> message -> email format', () => {
      const { result } = renderHook(() => useConnectForm());

      // All four checks would fail here; name must win because it's first.
      const allBlank = result.current.validateForm('', '', '');
      expect(allBlank, 'expected the name-missing message to win when everything is blank').toBe(
        'Please Fill out all required sections (name)',
      );

      // Name is now fine; email must win over message/format.
      const nameOnly = result.current.validateForm('Alex', '', '');
      expect(nameOnly, 'expected the email-missing message once name is present').toBe(
        'Please Fill out all required sections (Email)',
      );

      // Name and email present; message must win over the email-format check.
      const nameAndEmail = result.current.validateForm('Alex', 'not-an-email', '');
      expect(
        nameAndEmail,
        'expected the message-missing message to win over the invalid-email check',
      ).toBe('Please Fill out all required sections (Message)');

      // Only the email format is wrong now.
      const formatOnly = result.current.validateForm('Alex', 'not-an-email', 'hi there');
      expect(formatOnly, 'expected the invalid-email message once name/email/message are filled').toBe(
        'Please enter a valid email address',
      );
    });

    it('returns an empty string once every field is valid', () => {
      const { result } = renderHook(() => useConnectForm());

      act(() => {
        result.current.setName('Alex');
        result.current.setEmail('alex@example.com');
        result.current.setMessage('Hello there');
      });

      const error = result.current.validateForm('Alex', 'alex@example.com', 'Hello there');

      expect(error, `expected no validation error for a fully valid form, got: ${error}`).toBe('');
    });

    it(
      'validateForm is a pure function of its arguments: a valid email argument ' +
        'validates even when hook state holds something different (fixed F1)',
      () => {
        const { result } = renderHook(() => useConnectForm());

        // Never call setEmail: the hook's internal `email` state stays ''.
        // validateForm is documented as validateForm(name, email, message), and now
        // threads its `email` argument through to validateEmail instead of reading
        // stale/unset hook state, so this must validate the argument and return ''.
        const error = result.current.validateForm('Alex', 'alex@example.com', 'Hello there');

        expect(
          error,
          'validateForm should validate the "email" argument directly, independent of ' +
            `hook state; got: ${JSON.stringify(error)}`,
        ).toBe('');
      },
    );
  });

  describe('email validation (via validateForm)', () => {
    // validateEmail is not exported directly, so we drive it through validateForm.
    // validateForm validates its own arguments (F1), so syncing hook state via
    // setEmail first is not required for this call to reflect the given email —
    // it is still done here to mirror how ConnectForm.tsx actually uses the hook.
    const isValidEmail = (email: string) => {
      const { result } = renderHook(() => useConnectForm());
      act(() => {
        result.current.setName('Alex');
        result.current.setEmail(email);
        result.current.setMessage('hello there');
      });
      const error = result.current.validateForm('Alex', email, 'hello there');
      // Any error other than "" means the email was rejected (either as
      // missing, for '', or as malformed, for a bad format).
      return error === '';
    };

    it.each([
      ['a@b.co', true],
      ['first.last@sub.domain.org', true],
      ['user+tag@example.com', true],
      // IP-literal form: regression guard for Sprint 1's no-useless-escape fix to
      // the bracket-escaping in this exact regex.
      ['user@[192.168.1.1]', true],
      ['not-an-email', false],
      ['@example.com', false],
      ['a@', false],
      ['a b@example.com', false],
      ['', false],
    ])('validateEmail(%j) is valid=%s', (email, expected) => {
      const actual = isValidEmail(email);
      expect(
        actual,
        `expected validateEmail(${JSON.stringify(email)}) to be valid=${expected}, got valid=${actual}`,
      ).toBe(expected);
    });
  });

  describe('sendMessage', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('POSTs to {VITE_API_URL}/api/v1/contact with JSON name/email/message', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => useConnectForm());
      act(() => {
        result.current.setName('Alex');
        result.current.setEmail('alex@example.com');
        result.current.setMessage('Hello there');
      });

      let sent = false;
      await act(async () => {
        sent = await result.current.sendMessage();
      });

      expect(sent, 'sendMessage should resolve true on an ok response').toBe(true);
      expect(fetchMock, 'fetch should have been called exactly once').toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url, `expected the contact endpoint, got ${url}`).toBe(
        'http://localhost:8080/api/v1/contact',
      );
      expect(options.method, 'expected a POST request').toBe('POST');
      expect(
        (options.headers as Record<string, string>)['Content-Type'],
        'expected a JSON content-type header',
      ).toBe('application/json');

      const body = JSON.parse(options.body as string) as {
        name: string;
        email: string;
        message: string;
      };
      expect(body, `unexpected request body: ${options.body as string}`).toEqual({
        name: 'Alex',
        email: 'alex@example.com',
        message: 'Hello there',
      });
    });

    it('resolves to false (does not throw) when fetch rejects', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new Error('network down')),
      );
      // Silence the expected console.error from the catch block so test output
      // stays readable, without hiding a genuine failure.
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useConnectForm());
      act(() => {
        result.current.setName('Alex');
        result.current.setEmail('alex@example.com');
        result.current.setMessage('Hello there');
      });

      let sent: boolean | undefined;
      let threw = false;
      await act(async () => {
        try {
          sent = await result.current.sendMessage();
        } catch {
          threw = true;
        }
      });

      expect(threw, 'sendMessage must not throw when fetch rejects; callers rely on this').toBe(
        false,
      );
      expect(sent, 'expected sendMessage() to resolve to false on a network failure').toBe(false);

      consoleError.mockRestore();
    });

    it.each([400, 502])('resolves to false on a non-ok %i response', async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status } as Response),
      );

      const { result } = renderHook(() => useConnectForm());
      act(() => {
        result.current.setName('Alex');
        result.current.setEmail('alex@example.com');
        result.current.setMessage('Hello there');
      });

      let sent = true;
      await act(async () => {
        sent = await result.current.sendMessage();
      });

      expect(
        sent,
        `expected sendMessage() to resolve to false for a ${status} response`,
      ).toBe(false);
    });
  });
});
