// Workers Builds builds every branch with one shared set of build variables,
// so a branch Preview would ship the production PostHog token and send its
// visits to the real project. Only the main build keeps the token.
//
// Fails closed: a Workers Builds run without a branch counts as a Preview.
// Builds outside Workers Builds (local, GitHub Actions, e2e) never set
// WORKERS_CI and keep whatever token their shell provides.

/**
 * @param {Record<string, string | undefined>} env
 * @returns {boolean}
 */
export function isWorkersPreviewBuild(env) {
  return env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH !== 'main';
}
