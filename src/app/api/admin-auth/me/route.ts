import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authenticated = await requireAdmin(req);
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401 });
}
