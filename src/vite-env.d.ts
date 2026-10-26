/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_API_ROOT?: string;
  readonly VITE_STREAM_API_ROOT?: string;
  readonly VITE_JOURNEY_CHAT_API_ROOT?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
