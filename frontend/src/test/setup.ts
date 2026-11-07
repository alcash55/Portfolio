import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { installMatchMedia, resetSystem } from './system';

// jsdom implements <dialog> as a plain element with no showModal() or close().
// This stand-in covers the open attribute and the close event. Focus trapping,
// inert background and Esc are browser behavior, so the Playwright suite owns them.
function installDialog(): void {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
    showModal(): void;
    close(returnValue?: string): void;
  };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
    const first = this.querySelector<HTMLElement>('button, [href], input, [tabindex]');
    first?.focus();
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

installDialog();

beforeEach(() => {
  installMatchMedia();
  // No unit test reaches the network. A test that needs an answer injects its own fetch, so
  // a backend running on this machine cannot change a result.
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('unit tests do not reach the network'))),
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  resetSystem();
});
