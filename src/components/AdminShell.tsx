'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, PackageSearch, Users, LogOut } from 'lucide-react';
import { fetchCustomers } from '@/lib/customerApi';

type AdminNavKey = 'stock' | 'catalog' | 'customers';

const NAV_ITEMS: { key: AdminNavKey; href: string; label: string; icon: typeof Package }[] = [
  { key: 'stock', href: '/', label: 'Stock Sheet', icon: Package },
  { key: 'catalog', href: '/catalog', label: 'Vendor Catalog', icon: PackageSearch },
  { key: 'customers', href: '/customers', label: 'Customers', icon: Users },
];

async function handleLogout() {
  await fetch('/api/admin-auth/logout', { method: 'POST' });
  window.location.href = '/';
}

/** Shared macOS-window-style chrome for every admin screen: glass sidebar + glass toolbar around a scrollable content pane. */
export function AdminShell({
  active,
  title,
  toolbarActions,
  children,
}: {
  active: AdminNavKey;
  title: string;
  toolbarActions?: ReactNode;
  children: ReactNode;
}) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    fetchCustomers()
      .then((customers) => setPendingCount(customers.filter((c) => c.status === 'pending').length))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-window border border-border bg-surface shadow-2xl md:flex-row md:min-h-[720px]">
        {/* Traffic-light dots — purely decorative window chrome */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 hidden gap-2 md:flex">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>

        <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-sep bg-glass px-3 py-3 backdrop-blur-xl backdrop-saturate-150 md:w-56 md:flex-col md:items-stretch md:gap-0.5 md:overflow-visible md:border-b-0 md:border-r md:px-2.5 md:pb-4 md:pt-11">
          <div className="mb-1 hidden items-center gap-2 px-2 pb-3 md:flex">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white p-1">
              <Image src="/florence-icon.png" alt="" width={14} height={14} className="h-full w-full object-contain" />
            </div>
            <span className="text-[13px] font-semibold">Florence</span>
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md-a px-2.5 py-1.5 text-[13px] font-medium transition-colors md:w-full ${
                  isActive ? 'bg-accent text-black' : 'text-foreground hover:bg-white/5'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-black' : 'text-muted'} />
                {item.label}
                {item.key === 'customers' && pendingCount > 0 && (
                  <span
                    className={`ml-auto rounded-pill px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-black/20 text-black' : 'bg-warn-bg text-warn'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-[5] flex shrink-0 items-center justify-between gap-3 border-b border-sep bg-glass px-4 py-3 backdrop-blur-xl backdrop-saturate-150 md:mt-11 md:px-5">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            <div className="flex shrink-0 items-center gap-2">
              {toolbarActions}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-md-a border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-muted"
              >
                <LogOut size={13} /> <span className="hidden sm:inline">Log Out</span>
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
