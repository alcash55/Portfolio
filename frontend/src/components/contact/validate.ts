export const MESSAGE_LIMIT = 1500;

/** Field length caps. The inputs carry the same values as `maxlength`. */
export const LIMITS = { name: 100, email: 254, message: MESSAGE_LIMIT } as const;

export type ContactField = 'name' | 'email' | 'message';
export type ContactValues = Record<ContactField, string>;
export type ContactErrors = Partial<Record<ContactField, string>>;

// One "@", no spaces, and a dot in the domain. Strict enough to catch typos,
// loose enough that the server stays the authority on deliverability.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(values: ContactValues): ContactErrors {
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();
  const errors: ContactErrors = {};

  if (name === '') errors.name = 'Enter your name.';

  if (email === '') errors.email = 'Enter your email address.';
  else if (!EMAIL_SHAPE.test(email)) {
    errors.email = 'Enter a valid email address, such as name@example.com.';
  }

  if (message === '') errors.message = 'Enter a message.';
  else if (message.length > MESSAGE_LIMIT) {
    errors.message = `That message is too long. The limit is ${MESSAGE_LIMIT} characters.`;
  }

  return errors;
}
