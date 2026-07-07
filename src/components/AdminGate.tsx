'use client';

import { ReactNode, useEffect, useState } from 'react';
import Image from 'next/image';
import { Card, Field, TextInput } from './ui';

export function AdminGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    fetch('/api/admin-auth/me')
      .then((res) => setAuthenticated(res.ok))
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = async () => {
    setError(null);
    if (!password) {
      setError('Enter the admin password.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'Incorrect password');
        return;
      }
      setAuthenticated(true);
      setPassword('');
    } finally {
      setLoggingIn(false);
    }
  };

  if (checking) {
    return <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading…</div>;
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2">
            <Image src="/florence-icon.png" alt="Florence" width={28} height={28} className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Florence <span className="text-accent">Admin</span>
            </h1>
            <p className="text-xs text-muted">Enter the admin password to continue</p>
          </div>
        </div>
        <Card>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoFocus
            />
          </Field>
          {error && <p className="mt-3 text-xs text-loss">{error}</p>}
          <button
            onClick={handleLogin}
            disabled={loggingIn}
            className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            {loggingIn ? 'Checking…' : 'Unlock'}
          </button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
