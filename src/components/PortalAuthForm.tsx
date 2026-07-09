'use client';

import { useState } from 'react';

interface CustomerInfo {
  name: string;
  email: string;
  companyName: string;
  enabledBrands: string[];
}

export function PortalAuthForm({ onLoggedIn }: { onLoggedIn: (customer: CustomerInfo) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next);
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        name?: string;
        email?: string;
        companyName?: string;
        enabledBrands?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Invalid email or password');
        return;
      }
      onLoggedIn({ name: data.name!, email: data.email!, companyName: data.companyName ?? '', enabledBrands: data.enabledBrands ?? [] });
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async () => {
    setError(null);
    setSuccess(null);
    if (!name.trim() || !companyName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/customer/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, companyName, email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not create your account');
        return;
      }
      setSuccess('Account created! We’ll review it and let you know once you’re approved. You can try signing in after that.');
      setName('');
      setCompanyName('');
      setPassword('');
      setMode('signin');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Florence <span style={{ color: 'var(--accent)' }}>Client Portal</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {mode === 'signin' ? 'Sign in to check stock and pricing' : 'Request access to check stock and pricing'}
        </p>
      </div>

      <div className="ios-seg">
        <button className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>
          Sign In
        </button>
        <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>
          Sign Up
        </button>
      </div>

      <div className="ios-group">
        {mode === 'signup' && (
          <>
            <div className="ios-row">
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmed Khan" />
            </div>
            <div className="ios-row">
              <label>Company</label>
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Al Futtaim Trading" />
            </div>
          </>
        )}
        <div className="ios-row">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? handleLogin() : handleSignup())}
            placeholder="you@company.com"
          />
        </div>
        <div className="ios-row">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? handleLogin() : handleSignup())}
            placeholder="••••••••"
          />
        </div>
      </div>

      {error && <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--loss)' }}>{error}</p>}
      {success && <p style={{ marginBottom: 12, fontSize: 12, color: 'var(--profit)' }}>{success}</p>}

      <button onClick={mode === 'signin' ? handleLogin : handleSignup} disabled={busy} className="full-btn">
        {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Request Access'}
      </button>
    </div>
  );
}
