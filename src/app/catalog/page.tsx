import CatalogClient from './CatalogClient';

// Gates on the admin session cookie — must never be prerendered/cached, or a
// stale copy can hang after a deploy replaces its JS chunks (same pattern as /customers).
export const dynamic = 'force-dynamic';

export default function Page() {
  return <CatalogClient />;
}
