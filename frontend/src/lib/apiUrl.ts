const LOCAL_API = 'http://localhost:8080';

/**
 * The Go API base URL. `VITE_API_URL` is a public value, set at build time, and the
 * Worker and the browser read the same one.
 */
export function apiUrl(): string {
  const configured: unknown = import.meta.env.VITE_API_URL;
  if (typeof configured === 'string' && configured !== '') return configured;
  // A production build without the variable gets no API, so it fails visibly, where the
  // dev fallback would send a visitor's request to their own localhost.
  return import.meta.env.DEV ? LOCAL_API : '';
}

/** `path` under the API base, with exactly one slash between them. */
export function apiEndpoint(base: string, path: `/${string}`): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}
