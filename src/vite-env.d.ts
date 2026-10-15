/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WHOP_CHECKOUT_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
