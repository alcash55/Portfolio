import type { ContactErrorKind } from './sendContact';
import { MESSAGE_TOO_LONG, type ContactField, type ContactValues } from './validate';

/** The form's fields in the order they appear on the page. */
export const FIELDS: readonly ContactField[] = ['name', 'email', 'message'];

export const LABELS: Record<ContactField, string> = {
  name: 'Name',
  email: 'Email',
  message: 'Message',
};

export const EMPTY_VALUES: ContactValues = { name: '', email: '', message: '' };

/** What the banner says for each way a send can fail. */
export function failureCopy(kind: ContactErrorKind): string {
  switch (kind) {
    case 'validation':
      return 'Please check your details and try again.';
    case 'too_large':
      return MESSAGE_TOO_LONG;
    case 'rate_limited':
      return 'Too many messages. Wait a moment and try again.';
    case 'server_error':
    case 'timeout':
      return "Couldn't send that. Try again in a minute.";
    case 'network':
      return "Couldn't reach the server. LinkedIn works.";
    default: {
      const unhandled: never = kind;
      return unhandled;
    }
  }
}

/** Only these failures leave the visitor with a message worth retrying as is. */
export function isRetryable(kind: ContactErrorKind): boolean {
  return kind === 'server_error' || kind === 'timeout' || kind === 'network';
}

/** The send button's label for the current state. */
export function submitLabel(sending: boolean, failure: ContactErrorKind | null): string {
  if (sending) return 'Sending';
  if (failure && isRetryable(failure)) return 'Try again';
  return 'Send message';
}
