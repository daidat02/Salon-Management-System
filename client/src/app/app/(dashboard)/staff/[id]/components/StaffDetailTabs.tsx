'use client';

import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from 'cn';

// Tabs riêng cho khối chi tiết nhân viên: chia đều toàn bộ chiều rộng khối,
// icon nằm ngang cùng nhãn, gạch chân màu primary cho tab đang chọn.

export type StaffDetailTabItem = {
  value: string;
  label: string;
  icon: LucideIcon;
};

type StaffDetailTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  items: StaffDetailTabItem[];
  className?: string;
};

export function StaffDetailTabs({
  value,
  onValueChange,
  items,
  className,
}: StaffDetailTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-full', className)}>
      <TabsList
        variant="line"
        className={cn(
          'grid h-auto w-full grid-cols-2 gap-0 rounded-none border-b border-outline bg-surface p-0',
          'group-data-horizontal/tabs:h-auto sm:grid-cols-3 xl:grid-cols-5',
        )}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className={cn(
                'group relative flex h-auto w-full flex-row items-center justify-center gap-1.5 rounded-none border-0 px-2 py-3 text-center',
                'text-[11px] font-medium whitespace-normal text-on-surface-variant',
                'hover:bg-surface-container-low hover:text-on-surface',
                'data-active:bg-primary/5 data-active:font-semibold data-active:text-primary data-active:shadow-none',
                'after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-none after:bg-primary',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-center leading-tight">{item.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
