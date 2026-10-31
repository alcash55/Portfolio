import type { SendDeps } from './sendContact';

const LOCAL_API = 'http://localhost:8080';

/** The Go API base URL. `VITE_API_URL` is a public value, set at build time. */
function apiUrl(): string {
  const configured: unknown = import.meta.env.VITE_API_URL;
  return typeof configured === 'string' && configured !== '' ? configured : LOCAL_API;
}

export function defaultSendDeps(): SendDeps {
  // Wrapped so the call keeps `window` as its receiver.
  return { fetch: (input, init) => fetch(input, init), apiUrl: apiUrl() };
}
