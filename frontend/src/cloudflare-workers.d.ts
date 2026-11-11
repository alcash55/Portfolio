// The Worker runtime provides this module. Only the one export the server entry uses is typed.
declare module 'cloudflare:workers' {
  export function waitUntil(promise: Promise<unknown>): void;
}
