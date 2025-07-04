/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // 他の環境変数があればここに追加
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
} 