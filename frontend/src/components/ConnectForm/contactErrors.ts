import type { ContactErrorKind } from './useConnectForm';

/**
 * User-facing copy shown on a successful submit.
 */
export const CONTACT_SUCCESS_MESSAGE = 'Message sent successfully!';

/**
 * User-facing copy per failure kind, per the Sprint 3 interface contract's
 * status-code mapping table. `timeout` intentionally shares copy with
 * `server_error`: by the time a request aborts, it's just another failure to
 * the user -- the distinct `kind` still exists so it can be told apart for
 * logging/debugging.
 */
const CONTACT_ERROR_COPY: Record<ContactErrorKind, string> = {
  validation: 'Please check your details and try again.',
  too_large: 'That message is too long.',
  rate_limited: 'Too many messages — please wait a moment.',
  server_error: "Couldn't send right now — please try again later.",
  timeout: "Couldn't send right now — please try again later.",
};

/**
 * Maps a failed SendMessageResult's `kind` to the copy the user should see.
 * Never branch on the backend's raw `error` string -- only on `kind`, which
 * is itself derived from the HTTP status code.
 */
export const getContactErrorMessage = (kind: ContactErrorKind): string => CONTACT_ERROR_COPY[kind];
