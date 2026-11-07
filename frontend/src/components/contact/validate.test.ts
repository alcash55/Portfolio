import { describe, expect, it } from 'vitest';
import { MESSAGE_LIMIT, validateContact } from './validate';

const valid = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there.' };

describe('validateContact', () => {
  it('returns no errors for a complete message', () => {
    expect(validateContact(valid)).toEqual({});
  });

  it('asks for each empty field with its own sentence', () => {
    expect(validateContact({ name: '', email: '', message: '' })).toEqual({
      name: 'Enter your name.',
      email: 'Enter your email address.',
      message: 'Enter a message.',
    });
  });

  it('treats whitespace as empty', () => {
    expect(validateContact({ name: '   ', email: ' ', message: '\n\t' })).toEqual({
      name: 'Enter your name.',
      email: 'Enter your email address.',
      message: 'Enter a message.',
    });
  });

  it.each(['ada', 'ada@', '@example.com', 'ada@example', 'ada @example.com', 'a@b@c.com'])(
    'rejects the email %j with an example',
    (email) => {
      expect(validateContact({ ...valid, email })).toEqual({
        email: 'Enter a valid email address, such as name@example.com.',
      });
    },
  );

  it('accepts an email padded with spaces, since the form trims before sending', () => {
    expect(validateContact({ ...valid, email: '  ada@example.com ' })).toEqual({});
  });

  it('allows a message of exactly the limit and rejects one character more, naming the limit', () => {
    expect(MESSAGE_LIMIT).toBe(1500);
    expect(validateContact({ ...valid, message: 'x'.repeat(1500) })).toEqual({});
    expect(validateContact({ ...valid, message: 'x'.repeat(1501) })).toEqual({
      message: 'That message is too long. The limit is 1500 characters.',
    });
  });
});
