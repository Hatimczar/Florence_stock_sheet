import PublicCatalogClient from './PublicCatalogClient';

// Fetches live catalog + session data per request — must never be prerendered/cached at the
// edge, or a stale copy can hang after a deploy replaces its JS chunks (same pattern as /admin).
export const dynamic = 'force-dynamic';

export default function Page() {
  return <PublicCatalogClient />;
}
