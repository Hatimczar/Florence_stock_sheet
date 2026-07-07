declare global {
  interface CloudflareEnv {
    STOCK_SHEET_KV: KVNamespace;
    ADMIN_PASSWORD: string;
  }
}

export {};
