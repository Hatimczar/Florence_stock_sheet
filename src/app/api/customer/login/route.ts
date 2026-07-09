import { NextRequest, NextResponse } from 'next/server';
import { findCustomerByEmail } from '@/lib/customers';
import { verifyPassword, createSession, SESSION_COOKIE_NAME, isLoginLocked, recordFailedLogin, clearFailedLogins } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (await isLoginLocked(email)) {
    return NextResponse.json({ error: 'Too many failed attempts. Please try again in 15 minutes.' }, { status: 429 });
  }

  const customer = await findCustomerByEmail(email);
  const valid = customer ? await verifyPassword(password, customer.passwordHash) : false;

  if (!customer || !valid) {
    await recordFailedLogin(email);
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  if (customer.status === 'pending') {
    return NextResponse.json(
      { error: 'Your account is pending approval. You’ll be able to sign in once it’s approved.' },
      { status: 403 }
    );
  }

  await clearFailedLogins(email);
  const { token, maxAge } = await createSession(customer.id);

  const res = NextResponse.json({
    ok: true,
    name: customer.name,
    email: customer.email,
    companyName: customer.companyName,
    enabledBrands: customer.enabledBrands,
  });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
  return res;
}
