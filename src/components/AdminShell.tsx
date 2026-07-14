'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, PackageSearch, Users, LogOut, Menu } from 'lucide-react';
import { fetchCustomers } from '@/lib/customerApi';
import { ThemeToggle } from './ThemeToggle';
import { FlorenceLogo } from './FlorenceLogo';

type AdminNavKey = 'stock' | 'catalog' | 'customers';

const NAV_ITEMS: { key: AdminNavKey; href: string; label: string; icon: typeof Package }[] = [
  { key: 'stock', href: '/', label: 'Stock Sheet', icon: Package },
  { key: 'catalog', href: '/catalog', label: 'Asbis Brands', icon: PackageSearch },
  { key: 'customers', href: '/customers', label: 'Customers', icon: Users },
];

async function handleLogout() {
  await fetch('/api/admin-auth/logout', { method: 'POST' });
  window.location.href = '/';
}

/** Clean, minimal app shell inspired by the V3 design demo — glass sidebar + glass toolbar. */
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setSidebarOpen(window.innerWidth > 820);
  }, []);

  useEffect(() => {
    fetchCustomers()
      .then((customers) => setPendingCount(customers.filter((c) => c.status === 'pending').length))
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mac-window">
        <div className={`mac-backdrop ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)} />

        <div className={`mac-sidebar ${sidebarOpen ? 'sb-open' : 'sb-closed'}`}>
          <div className="mac-brand">
            <div className="mark">
              <FlorenceLogo size={20} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="menu-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-label="Toggle sidebar">
                <Menu />
              </button>
              <h2>{title}</h2>
            </div>
            <div className="toolbar-actions">
              {toolbarActions}
              <ThemeToggle />
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
