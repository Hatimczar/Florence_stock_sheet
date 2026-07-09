'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, Field, TextInput } from './ui';

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

  const logoBadge = (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2">
      <Image src="/florence-icon.png" alt="Florence" width={28} height={28} className="h-full w-full object-contain" />
    </div>
  );

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
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        {logoBadge}
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Florence <span className="text-accent">Client Portal</span>
          </h1>
          <p className="text-xs text-muted">
            {mode === 'signin' ? 'Sign in to check stock and pricing' : 'Request access to check stock and pricing'}
          </p>
        </div>
      </div>

      <div className="mb-4 flex rounded-lg border border-border bg-surface-muted p-1">
        <button
          onClick={() => switchMode('signin')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-accent text-black' : 'text-muted'}`}
        >
          Sign In
        </button>
        <button
          onClick={() => switchMode('signup')}
          className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-accent text-black' : 'text-muted'}`}
        >
          Sign Up
        </button>
      </div>

      <Card>
        {mode === 'signup' && (
          <>
            <Field label="Your Name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmed Khan" />
            </Field>
            <div className="mt-3">
              <Field label="Company Name">
                <TextInput value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Al Futtaim Trading" />
              </Field>
            </div>
          </>
        )}
        <div className={mode === 'signup' ? 'mt-3' : ''}>
          <Field label="Email">
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? handleLogin() : handleSignup())}
              placeholder="you@company.com"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (mode === 'signin' ? handleLogin() : handleSignup())}
              placeholder="••••••••"
            />
          </Field>
        </div>
        {error && <p className="mt-3 text-xs text-loss">{error}</p>}
        {success && <p className="mt-3 text-xs text-profit">{success}</p>}
        <button
          onClick={mode === 'signin' ? handleLogin : handleSignup}
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Request Access'}
        </button>
      </Card>
    </div>
  );
}
