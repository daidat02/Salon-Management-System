'use client';

import * as React from 'react';
import { Tag } from '@/components/ui/tag';

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 text-xs font-semibold text-on-surface">
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
    </label>
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
