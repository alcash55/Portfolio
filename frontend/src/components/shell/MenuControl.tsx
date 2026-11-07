import { useRef } from 'react';
import { SectionLinks } from './SectionLinks';
import type { NavId } from './nav';
import { useHydrated } from './useHydrated';

// A link before hydration and a button after it, so both share the look.
const PILL = [
  'inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-line-strong',
  'px-[18px] text-[0.9375rem] leading-none font-medium hover:bg-fill min-[1024px]:hidden',
].join(' ');

// The dialog fills the viewport so a click on it is a click on the scrim, and the panel floats under
// the header. Keep `display` off it: the browser hides a closed dialog with it. The scrim and the
// panel fade and slide in only when motion is welcome.
const DIALOG = [
  'fixed inset-0 size-full max-h-none max-w-none overflow-hidden bg-transparent text-ink',
  'backdrop:bg-scrim',
  'motion-safe:open:backdrop:transition-[background-color]',
  'motion-safe:open:backdrop:duration-(--duration-sheet) motion-safe:open:backdrop:ease-(--ease-drawer)',
  'motion-safe:open:backdrop:starting:bg-transparent',
].join(' ');
// The slide is a transform, not translate, so the transition below can name it.
const PANEL = [
  'absolute top-[calc(var(--hdr)-8px)] right-(--gutter) left-(--gutter) ml-auto max-w-96 p-[12px]',
  'rounded-card border border-line bg-surface shadow-card',
  'motion-safe:in-open:transition-[transform,opacity] motion-safe:in-open:duration-(--duration-sheet)',
  'motion-safe:in-open:ease-(--ease-drawer)',
  'motion-safe:in-open:starting:[transform:translateY(-12px)] motion-safe:in-open:starting:opacity-0',
].join(' ');
const CLOSE = [
  'mb-[4px] flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full',
  'border-[1.5px] border-line-strong text-[0.9375rem] leading-none font-medium hover:bg-fill',
].join(' ');

/**
 * Below 1024px. The server sends a link to the footer nav, which works with
 * JavaScript off. Once hydrated it becomes a button that opens a native modal
 * dialog, so the browser supplies the focus trap, the inert page and Esc.
 */
export function MenuControl({ current = null }: { current?: NavId | null }) {
  const hydrated = useHydrated();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (!hydrated) {
    return (
      <a className={PILL} href="#footer-nav">
        Menu
      </a>
    );
  }

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={PILL}
        onClick={() => dialogRef.current?.showModal()}
      >
        Menu
      </button>
      <dialog
        ref={dialogRef}
        className={DIALOG}
        aria-label="Site menu"
        // Browsers already return focus on close. This covers the ones that skip it for a button that was not focused by keyboard.
        onClose={() => triggerRef.current?.focus()}
        // The dialog fills the viewport and the panel sits inside it, so a click that lands on the dialog itself is a click on the scrim.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={PANEL}>
          <button type="button" className={CLOSE} onClick={close}>
            Close menu
          </button>
          <nav aria-label="Menu">
            <ul>
              <SectionLinks current={current} variant="menu" onNavigate={close} asListItems />
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
