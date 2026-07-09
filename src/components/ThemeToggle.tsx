'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('florence-theme', theme);
}

/** Light/Dark toggle — mirrors the V3 design demo's theme chip. Persists to localStorage. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.getAttribute('data-theme') as Theme | null) ?? 'dark';
    setTheme(current);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  // Avoid a mismatched icon flash before we know the real theme on mount.
  if (!mounted) return <span style={{ width: 32, height: 32, display: 'inline-block' }} />;

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="toolbar-btn"
      style={{ padding: 8, borderRadius: '50%' }}
    >
      {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
