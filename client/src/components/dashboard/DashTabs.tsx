'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from 'cn';

// Tabs chuyển đổi dùng chung cho dashboard (segmented control) — bọc shadcn Tabs.
// Mẫu từ toolbar Danh mục: nền xám, tab active nền primary chữ trắng.

export type DashTabItem = {
  value: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
};

type DashTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  items: DashTabItem[];
  className?: string;
};

export default function DashTabs({ value, onValueChange, items, className }: DashTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-fit', className)}>
      <TabsList className="h-auto border border-outline/70 bg-surface-container p-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              disabled={item.disabled}
              className="h-auto flex-none px-3.5 py-1.5 text-xs text-on-surface-variant hover:text-on-surface data-active:bg-primary data-active:font-semibold data-active:text-white data-active:shadow-sm"
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
