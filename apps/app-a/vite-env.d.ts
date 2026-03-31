/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_GATEWAY_URL: string;
  readonly VITE_ALLOWED_DOMAIN: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
