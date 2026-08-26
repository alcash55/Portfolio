/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Portfolio backend, e.g. https://api.example.com */
  readonly VITE_API_URL?: string;
  /**
   * PostHog project token. Public by design -- it is a write-only ingest key
   * meant to ship in the client bundle, which is why it is safe under the
   * `VITE_` prefix. Optional: absent means analytics is off (see
   * `hooks/useAnalytics.ts`).
   */
  readonly VITE_POSTHOG_PROJECT_TOKEN?: string;
  /** PostHog ingest host -- differs between the US cloud, the EU cloud and self-hosted. */
  readonly VITE_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
