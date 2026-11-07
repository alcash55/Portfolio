import { apiUrl } from '~/lib/apiUrl';
import type { SendDeps } from './sendContact';

export function defaultSendDeps(): SendDeps {
  // Wrapped so the call keeps `window` as its receiver.
  return { fetch: (input, init) => fetch(input, init), apiUrl: apiUrl() };
}
