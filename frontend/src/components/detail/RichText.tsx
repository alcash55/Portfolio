import { Fragment } from 'react';

// The Tailwind base sets a ui-monospace stack, which picks a different face on some systems.
// The generic family keeps inline code in the face the write-ups were set in.
const CODE = 'font-[monospace]';

/** Page strings mark code with backticks. A lone backtick stays a literal character. */
export function RichText({ text }: { text: string }) {
  // split() with one capture group puts the code spans at the odd indexes.
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className={CODE}>
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
