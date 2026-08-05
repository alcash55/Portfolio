import { useState } from 'react';

/**
 * Distinguishes contact-request failures by the reason the caller cares about
 * (what copy to show), not by the backend's raw error string. Mirrors the
 * status-code -> copy mapping in the Sprint 3 interface contract.
 */
export type ContactErrorKind =
  | 'validation' // 400
  | 'too_large' // 413
  | 'rate_limited' // 429
  | 'server_error' // 502, any other non-ok status, or a network throw
  | 'timeout'; // aborted after the 60s cold-start allowance

/**
 * Result of a contact submission. `error` (when present) is the backend's raw
 * message and is for logging/debugging only -- never render it directly, and
 * never branch UI copy on it. Branch on `kind` instead.
 */
export type SendMessageResult =
  | { ok: true }
  | { ok: false; kind: ContactErrorKind; status?: number; error?: string };

// The Render free plan spins down after ~15 min idle; a cold start takes ~50s.
// 60s gives a real cold start room to finish instead of aborting it right before
// it would have succeeded.
const CONTACT_TIMEOUT_MS = 60_000;

const mapStatusToKind = (status: number): ContactErrorKind => {
  switch (status) {
    case 400:
      return 'validation';
    case 413:
      return 'too_large';
    case 429:
      return 'rate_limited';
    default:
      return 'server_error';
  }
};

/**
 * Use Connect Form Hook that returns a set of functions to interact with the form
 * @returns { setName, setEmail, setMessage, setWebsite, sendMessage, name, email, message, website, validateForm, getFieldErrors }
 */
const useConnectForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  // Honeypot field (F3): real bots fill every input they find; humans never
  // see or reach this one. Left non-empty, the backend silently drops the
  // message instead of forwarding it to Discord.
  const [website, setWebsite] = useState('');
  const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

  /**
   * Sends the message to the Portfolio backend, which validates it and forwards
   * it to Discord. The webhook URL is held server-side and never reaches the
   * browser bundle. Aborts after 60s to cover a Render cold start without
   * hanging forever, and maps the response to a typed result the UI can turn
   * into user-safe copy without inspecting the backend's error string.
   * @returns {Promise<SendMessageResult>}
   */
  const sendMessage = async (): Promise<SendMessageResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONTACT_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}/api/v1/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, message, website }),
        signal: controller.signal,
      });

      if (response.ok) {
        return { ok: true };
      }

      // Best-effort: the body is only used for logging, so a non-JSON or
      // empty body (e.g. a mocked response in tests) must not throw here.
      let serverError: string | undefined;
      try {
        const data = (await response.json()) as { error?: string };
        serverError = data.error;
      } catch {
        serverError = undefined;
      }

      if (serverError) {
        console.error('Contact request failed', response.status, serverError);
      }

      return {
        ok: false,
        kind: mapStatusToKind(response.status),
        status: response.status,
        error: serverError,
      };
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.error('Contact request timed out waiting for a cold server');
        return { ok: false, kind: 'timeout' };
      }
      console.error('Failed to send message', e);
      return { ok: false, kind: 'server_error' };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  /**
   * Validates the email to check if it's valid
   * @see https://emailregex.com/
   * @param {string} email
   * @returns {boolean}
   */
  const validateEmail = (email: string) => {
    if (!email) return false;

    const checkEmail =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (email.match(checkEmail)) {
      return true;
    } else {
      return false;
    }
  };

  /**
   * Validates the form to check if all required information is entered and email is valid.
   * Returns a single message for the first failing check, in priority order
   * name -> email -> message -> email format. Used to gate the Send button.
   * @returns {string}
   */
  const validateForm = (name: string, email: string, message: string) => {
    const checks = [
      { check: name, error: 'Please Fill out all required sections (name)' },
      { check: email, error: 'Please Fill out all required sections (Email)' },
      {
        check: message,
        error: 'Please Fill out all required sections (Message)',
      },
      { check: validateEmail(email), error: 'Please enter a valid email address' },
    ];

    for (const check of checks) {
      if (!check.check) {
        return check.error;
      }
    }

    return '';
  };

  /**
   * Per-field validation errors (F4), independent of validateForm's single
   * first-error message. Each field reports its own problem (if any) so the
   * UI can attach `error`/`helperText` to the specific field, per-touched-field.
   * @returns {{ name: string, email: string, message: string }}
   */
  const getFieldErrors = (name: string, email: string, message: string) => ({
    name: name ? '' : 'Please Fill out all required sections (name)',
    email: !email
      ? 'Please Fill out all required sections (Email)'
      : !validateEmail(email)
        ? 'Please enter a valid email address'
        : '',
    message: message ? '' : 'Please Fill out all required sections (Message)',
  });

  return {
    setName,
    setEmail,
    setMessage,
    setWebsite,
    sendMessage,
    name,
    email,
    message,
    website,
    validateForm,
    getFieldErrors,
  };
};

export default useConnectForm;
