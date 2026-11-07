import { useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

const RESET_MS = 2000;
const BUTTON = [
  'inline-flex min-h-11 items-center',
  'ml-[12px] rounded-full border-[1.5px] border-line-strong px-[14px]',
  'text-[0.9375rem] leading-none font-medium text-ink',
  'cursor-pointer transition-[background-color] duration-(--duration-press) ease-linear',
  'hover:bg-fill',
].join(' ');
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
      <button type="button" className={BUTTON} onClick={() => void copy()}>
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
