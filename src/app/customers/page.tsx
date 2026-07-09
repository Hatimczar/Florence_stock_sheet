import CustomersClient from './CustomersClient';

// Gates on a per-request cookie check (AdminGate) — must never be prerendered/
// cached at the edge, or a stale copy can hang after a deploy replaces its JS chunks.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <CustomersClient />;
}
