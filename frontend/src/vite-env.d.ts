/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Portfolio backend, e.g. https://api.example.com */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
