'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function SectionHeader({ step, title, subtitle }: { step?: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex items-baseline gap-2">
      {step && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {step}
        </span>
      )}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent focus:ring-1 focus:ring-accent';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputBase, props.className)} />;
}

export function SelectInput({
  value,
  onValueChange,
  options,
  ...rest
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>) {
  return (
    <select
      {...rest}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={clsx(inputBase, 'appearance-none')}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function StatCard({
  label,
  value,
  tone = 'neutral',
  size = 'md',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'profit' | 'loss' | 'accent' | 'warn';
  size?: 'sm' | 'md' | 'lg';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'text-foreground',
    profit: 'text-profit',
    loss: 'text-loss',
    accent: 'text-accent',
    warn: 'text-warn',
  };
  const sizeClasses: Record<string, string> = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };
  return (
    <div className="rounded-xl border border-border bg-surface-muted px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className={clsx('mt-1 font-semibold tabular-nums', toneClasses[tone], sizeClasses[size])}>{value}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'profit' | 'loss' | 'accent' | 'warn';
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'bg-border/60 text-muted',
    profit: 'bg-profit-bg text-profit',
    loss: 'bg-loss-bg text-loss',
    accent: 'bg-accent/15 text-accent',
    warn: 'bg-warn-bg text-warn',
  };
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone])}>
      {children}
    </span>
  );
}
