'use client';

import * as React from 'react';
import { Tag } from '@/components/ui/tag';

// Các mảnh form dùng chung cho các tab staff detail.

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-on-surface">
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
    </label>
  );
}

export function RadioPills({
  options,
  value,
  onChange,
}: {
  options: (string | { label: string; value: string })[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { label: o, value: o } : o;
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-4 py-2 text-xs transition-colors ${
              selected
                ? 'border-primary bg-brand-light/60 font-semibold text-primary'
                : 'border-outline bg-white font-medium text-on-surface-variant hover:border-primary/50 hover:text-on-surface'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FormSection({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-bold text-on-surface">{title}</h3>
        {badge && (
          <Tag variant="default" shape="pill" size="sm">
            {badge}
          </Tag>
        )}
      </div>
      <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}
