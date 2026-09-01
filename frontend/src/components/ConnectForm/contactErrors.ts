import type { ContactErrorKind } from './useConnectForm';

/**
 * User-facing copy shown on a successful submit.
 */
export const CONTACT_SUCCESS_MESSAGE = 'Message sent successfully!';

/**
 * User-facing copy per failure kind. The frontend maps HTTP status codes to
 * this copy and deliberately never branches on the backend's `error` string
 * (see SendMessageResult in useConnectForm.ts) -- coupling UI wording to
 * backend internals breaks the moment someone rewords a message on that
 * side. `timeout` intentionally shares copy with `server_error`: by the time
 * a request aborts, it's just another failure to the user. The distinct
 * `kind` still exists so it can be told apart for logging/debugging.
 */
const CONTACT_ERROR_COPY: Record<ContactErrorKind, string> = {
  validation: 'Please check your details and try again.',
  too_large: 'That message is too long.',
  rate_limited: 'Too many messages. Wait a moment and try again.',
  server_error: "Couldn't send that. Try again in a minute.",
  timeout: "Couldn't send that. Try again in a minute.",
};

/**
 * Maps a failed SendMessageResult's `kind` to the copy the user should see.
 * Never branch on the backend's raw `error` string -- only on `kind`, which
 * is itself derived from the HTTP status code.
 */
export const getContactErrorMessage = (kind: ContactErrorKind): string => CONTACT_ERROR_COPY[kind];
