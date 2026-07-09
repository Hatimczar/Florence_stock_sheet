'use client';

import { ReactNode, useEffect, useState } from 'react';

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
    return (
      <div className="flex flex-1 items-center justify-center text-sm" style={{ color: 'var(--muted)' }}>
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-6" style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Florence <span style={{ color: 'var(--accent)' }}>Admin</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Enter the admin password to continue</p>
        </div>
        <div className="ios-group">
          <div className="ios-row">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              autoFocus
            />
          </div>
        </div>
        {error && <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}
        <button onClick={handleLogin} disabled={loggingIn} className="full-btn">
          {loggingIn ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
