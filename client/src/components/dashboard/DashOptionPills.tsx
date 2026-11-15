'use client';

import * as React from 'react';
import { cn } from 'cn';

export type DashOption = string | { label: string; value: string };

type DashOptionPillsProps = {
  options: DashOption[];
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

function normalizeOption(option: DashOption): { label: string; value: string } {
  return typeof option === 'string' ? { label: option, value: option } : option;
}

export function DashOptionPills({
  options,
  value,
  onChange,
  disabled,
  className,
}: DashOptionPillsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const opt = normalizeOption(option);
        const selected = opt.value === value;

        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            aria-label={opt.label}
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-lg border px-4 py-2 text-xs transition-colors',
              selected
                ? 'border-primary bg-brand-light/60 font-semibold text-primary'
                : 'border-outline bg-white font-medium text-on-surface-variant hover:border-primary/50 hover:text-on-surface',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
