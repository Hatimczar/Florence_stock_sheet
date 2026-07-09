import PortalClient from './PortalClient';

// Session-gated on the customer's cookie — must never be prerendered/cached
// at the edge, or a stale copy can hang after a deploy replaces its JS chunks.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <PortalClient />;
}
