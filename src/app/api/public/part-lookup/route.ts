import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { lookupPartCost } from '@/lib/partLookup';

export const dynamic = 'force-dynamic';

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Cross-app endpoint: lets the Florence Price Calculator fetch a part's cost by Part Number,
// so it doesn't have to be re-entered by hand. Gated by a shared secret (not customer/admin
// session auth) since the caller is another service, not a browser with a Florence login.
export async function GET(req: NextRequest) {
  const { env } = await getCloudflareContext({ async: true });
  const providedKey = req.headers.get('x-api-key') ?? '';
  if (!env.PART_LOOKUP_API_KEY || !constantTimeEqual(providedKey, env.PART_LOOKUP_API_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partNumber = req.nextUrl.searchParams.get('partNumber')?.trim();
  if (!partNumber) return NextResponse.json({ error: 'partNumber query param is required' }, { status: 400 });

  const result = await lookupPartCost(partNumber);
  return NextResponse.json(result);
}
