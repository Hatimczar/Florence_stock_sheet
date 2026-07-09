declare global {
  interface CloudflareEnv {
    STOCK_SHEET_KV: KVNamespace;
    ADMIN_PASSWORD: string;
    IT4PROFIT_USERNAME: string;
    IT4PROFIT_PASSWORD: string;
  }
}

export {};
