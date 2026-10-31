import { useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

const RESET_MS = 2000;
const FAILED_LABEL = "Couldn't copy. Select the address instead.";

export function CopyEmailButton({ address }: { address: string }) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setState('copied');
    } catch {
      // Also covers a missing clipboard API on a page that is not a secure context.
      setState('failed');
    }
  }

  const label =
    state === 'copied' ? 'Copied' : state === 'failed' ? FAILED_LABEL : 'Copy email address';

  return (
    <>
      <button type="button" className="ct-copy" onClick={() => void copy()}>
        {label}
      </button>
      <span role="status" className="sr">
        {state === 'copied'
          ? 'Email address copied to clipboard.'
          : state === 'failed'
            ? FAILED_LABEL
            : ''}
      </span>
    </>
  );
}
