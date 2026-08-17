import { NextResponse } from 'next/server';
import { getPublicCatalog } from '@/lib/publicCatalog';

export const dynamic = 'force-dynamic';

// No auth check — this is the public storefront catalog. Availability is shown to everyone;
// pricing is never included here (see getPublicCatalog for what stays gated).
export async function GET() {
  const items = await getPublicCatalog();
  return NextResponse.json({ items });
}
