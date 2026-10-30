import { useRef } from 'react';
import { SectionLinks } from './SectionLinks';
import type { NavId } from './nav';
import { useHydrated } from './useHydrated';

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
      <a className="menu-pill" href="#footer-nav">
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
        className="menu-pill"
        onClick={() => dialogRef.current?.showModal()}
      >
        Menu
      </button>
      <dialog
        ref={dialogRef}
        className="menu-dialog"
        aria-label="Site menu"
        // Browsers already return focus on close. This covers the ones that skip it for a button that was not focused by keyboard.
        onClose={() => triggerRef.current?.focus()}
        // The dialog fills the viewport and the panel sits inside it, so a click that lands on the dialog itself is a click on the scrim.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="menu-panel">
          <button type="button" className="menu-close" onClick={close}>
            Close menu
          </button>
          <nav aria-label="Menu">
            <ul>
              <SectionLinks current={current} onNavigate={close} asListItems />
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
