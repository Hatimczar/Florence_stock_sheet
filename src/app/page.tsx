import HomeClient from './HomeClient';

// This page gates on a per-request cookie check (AdminGate), so it must never
// be prerendered/cached at the edge — a stale cached copy after a deploy can
// reference deleted JS chunk files and hang forever on the client.
export const dynamic = 'force-dynamic';

export default function Page() {
  return <HomeClient />;
}
