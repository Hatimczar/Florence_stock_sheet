import { NextRequest, NextResponse } from 'next/server';
import { createSignup } from '@/lib/customers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    companyName?: string;
    email?: string;
    password?: string;
  };

  if (!body.name?.trim() || !body.companyName?.trim() || !body.email?.trim() || !body.password) {
    return NextResponse.json({ error: 'Name, company name, email, and password are all required' }, { status: 400 });
  }
  if (body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  try {
    await createSignup({
      name: body.name,
      companyName: body.companyName,
      email: body.email,
      password: body.password,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not create account' }, { status: 400 });
  }
}
