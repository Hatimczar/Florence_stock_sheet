import { getCloudflareContext } from '@opennextjs/cloudflare';

const PBKDF2_ITERATIONS = 100_000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_WINDOW_SECONDS = 15 * 60;

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return `${bytesToHex(salt)}:${bytesToHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = hexToBytes(saltHex);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  const computedHex = bytesToHex(bits);
  // constant-time-ish compare
  if (computedHex.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

export const SESSION_COOKIE_NAME = 'florence_session';

export async function createSession(customerId: string): Promise<{ token: string; maxAge: number }> {
  const { env } = await getCloudflareContext({ async: true });
  const token = crypto.randomUUID() + crypto.randomUUID();
  await env.STOCK_SHEET_KV.put(`session:${token}`, JSON.stringify({ customerId }), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return { token, maxAge: SESSION_TTL_SECONDS };
}

export async function getSessionCustomerId(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const { env } = await getCloudflareContext({ async: true });
  const raw = await env.STOCK_SHEET_KV.get(`session:${token}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { customerId: string };
    return parsed.customerId;
  } catch {
    return null;
  }
}

export async function destroySession(token: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  await env.STOCK_SHEET_KV.delete(`session:${token}`);
}

interface LoginAttempts {
  count: number;
}

export async function isLoginLocked(email: string): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const raw = await env.STOCK_SHEET_KV.get(`login_attempts:${email.toLowerCase()}`);
  if (!raw) return false;
  const attempts = JSON.parse(raw) as LoginAttempts;
  return attempts.count >= LOGIN_LOCKOUT_THRESHOLD;
}

export async function recordFailedLogin(email: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  const key = `login_attempts:${email.toLowerCase()}`;
  const raw = await env.STOCK_SHEET_KV.get(key);
  const attempts: LoginAttempts = raw ? JSON.parse(raw) : { count: 0 };
  attempts.count += 1;
  await env.STOCK_SHEET_KV.put(key, JSON.stringify(attempts), { expirationTtl: LOGIN_LOCKOUT_WINDOW_SECONDS });
}

export async function clearFailedLogins(email: string): Promise<void> {
  const { env } = await getCloudflareContext({ async: true });
  await env.STOCK_SHEET_KV.delete(`login_attempts:${email.toLowerCase()}`);
}
