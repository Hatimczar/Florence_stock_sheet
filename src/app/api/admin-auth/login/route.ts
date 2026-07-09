import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword, createAdminSession, ADMIN_SESSION_COOKIE_NAME } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { password?: string };
  if (!body.password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  const valid = await verifyAdminPassword(body.password);
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const { token, maxAge } = await createAdminSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}
