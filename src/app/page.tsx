import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, getSessionCustomerId } from '@/lib/auth';
import PublicCatalogClient from './PublicCatalogClient';

// Fetches live catalog + session data per request — must never be prerendered/cached at the
// edge, or a stale copy can hang after a deploy replaces its JS chunks (same pattern as /admin).
export const dynamic = 'force-dynamic';

export default async function Page() {
  // Signed-in customers get their pricing/selection/WhatsApp workflow at /portal only — this
  // page is the signed-out public catalog. Redirecting here (server-side, before any HTML ships)
  // avoids ever flashing the public grid to a customer who's already authenticated.
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const customerId = await getSessionCustomerId(token);
  if (customerId) redirect('/portal');

  return <PublicCatalogClient />;
}
