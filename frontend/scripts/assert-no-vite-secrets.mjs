// Guards against a `VITE_`-prefixed env var that holds a credential-shaped
// value. Vite inlines every `VITE_`-prefixed value into the client bundle
// verbatim, so a value like this shipping to every visitor is not a bug
// class this app has room to repeat: a Discord webhook set as
// VITE_WEBHOOK_URL did exactly that for roughly two years before the
// contact form moved server-side (issue #29).
//
// Matched against the *value*, not the variable name. VITE_POSTHOG_PROJECT_TOKEN
// is a write-only ingest key that is meant to ship in the bundle (see
// frontend/src/.env.example) -- a name-based check ("contains TOKEN") would
// flag it on every build and train everyone to ignore the guard.
export const CREDENTIAL_SHAPED_VALUE = [
  // Chat-platform incoming webhooks. The URL itself is the bearer credential
  // for these -- no separate secret or signature is needed to use it.
  /https?:\/\/(discord(app)?\.com\/api\/webhooks|hooks\.slack\.com\/services|[a-z0-9-]+\.webhook\.office\.com)\//i,
  // Common cloud/API key prefixes with fixed, recognizable shapes.
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key ID
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/, // GitHub personal/app/refresh token
  /\bsk_live_[A-Za-z0-9]{20,}\b/, // Stripe live secret key
  /\bxox[baprs]-[A-Za-z0-9-]+\b/, // Slack token
  /\bAIza[0-9A-Za-z\-_]{35}\b/, // Google API key
  // PEM private key block.
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

/**
 * Returns the names (never the values) of every `VITE_`-prefixed key in
 * `env` whose value matches a credential-shaped pattern.
 *
 * @param {Record<string, string>} env
 * @returns {string[]}
 */
export function findCredentialShapedViteEnv(env) {
  return Object.entries(env)
    .filter(([key]) => key.startsWith('VITE_'))
    .filter(([, value]) => CREDENTIAL_SHAPED_VALUE.some((pattern) => pattern.test(value)))
    .map(([key]) => key);
}

/**
 * Throws if any `VITE_`-prefixed var in `env` looks like a credential.
 * Called from vite.config.ts during `vite build`.
 *
 * @param {Record<string, string>} env
 */
export function assertNoCredentialShapedViteEnv(env) {
  const offenders = findCredentialShapedViteEnv(env);
  if (offenders.length > 0) {
    throw new Error(
      `Build blocked: ${offenders.join(', ')} looks like a credential (webhook URL, API key, or private ` +
        `key) but is VITE_-prefixed, which means Vite inlines it into the public client bundle. Move it ` +
        `server-side (a non-VITE_ env var the Go backend reads) instead. See issue #29.`,
    );
  }
}
