import { Fragment } from 'react';

/** Page strings mark code with backticks. A lone backtick stays a literal character. */
export function RichText({ text }: { text: string }) {
  // split() with one capture group puts the code spans at the odd indexes.
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}
