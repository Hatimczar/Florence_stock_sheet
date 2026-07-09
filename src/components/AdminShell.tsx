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

/** macOS-window shell ported 1:1 from the V3 design demo — glass sidebar, traffic-light titlebar, glass toolbar. */
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
      <div className="mac-window">
        <div className="mac-titlebar">
          <div className="mac-dots">
            <span className="r" />
            <span className="y" />
            <span className="g" />
          </div>
        </div>

        <div className="mac-sidebar">
          <div className="mac-brand">
            <div className="mark">
              <Image src="/florence-icon.png" alt="" width={14} height={14} />
            </div>
            <span className="name">Florence</span>
          </div>

          <div className="mac-nav-section">Workspace</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <Link key={item.key} href={item.href} className={`mac-nav-item ${isActive ? 'active' : ''}`}>
                <Icon />
                {item.label}
                <span className="sp" />
                {item.key === 'customers' && pendingCount > 0 && <span className="count">{pendingCount}</span>}
              </Link>
            );
          })}
        </div>

        <div className="mac-main">
          <div className="mac-toolbar">
            <h2>{title}</h2>
            <div className="toolbar-actions">
              {toolbarActions}
              <button className="toolbar-btn" onClick={handleLogout}>
                <LogOut /> Log Out
              </button>
            </div>
          </div>
          <div className="mac-scroll">{children}</div>
        </div>
      </div>
    </div>
  );
}
