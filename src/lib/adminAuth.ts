import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

export const ADMIN_SESSION_COOKIE_NAME = 'florence_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.ADMIN_PASSWORD) return false;
  return constantTimeEqual(password, env.ADMIN_PASSWORD);
}

export async function createAdminSession(): Promise<{ token: string; maxAge: number }> {
  const { env } = await getCloudflareContext({ async: true });
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.STOCK_SHEET_KV.put(`admin_session:${token}`, '1', { expirationTtl: ADMIN_SESSION_TTL_SECONDS });
  return { token, maxAge: ADMIN_SESSION_TTL_SECONDS };
}

export async function isValidAdminSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const { env } = await getCloudflareContext({ async: true });
  const raw = await env.STOCK_SHEET_KV.get(`admin_session:${token}`);
  return raw !== null;
}

export async function destroyAdminSession(token: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  await env.STOCK_SHEET_KV.delete(`admin_session:${token}`);
}

export async function requireAdmin(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return isValidAdminSession(token);
}
