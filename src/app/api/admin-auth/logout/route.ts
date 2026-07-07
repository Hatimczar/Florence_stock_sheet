import { NextRequest, NextResponse } from 'next/server';
import { destroyAdminSession, ADMIN_SESSION_COOKIE_NAME } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (token) await destroyAdminSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return res;
}
