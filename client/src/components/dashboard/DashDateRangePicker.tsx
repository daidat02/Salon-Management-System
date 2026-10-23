'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from 'cn';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DateRangePreset = {
  label: string;
  getRange: () => DateRange;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const PRESETS: DateRangePreset[] = [
  {
    label: 'Hôm nay',
    getRange: () => {
      const today = startOfDay(new Date());
      return { from: today, to: today };
    },
  },
  {
    label: '7 ngày qua',
    getRange: () => {
      const to = startOfDay(new Date());
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      return { from, to };
    },
  },
  {
    label: 'Tháng này',
    getRange: () => {
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    },
  },
];

type DashDateRangePickerProps = {
  value?: DateRange;
  onValueChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  dateFormat?: string;
  align?: 'start' | 'center' | 'end';
};

function formatRange(
  range: DateRange | undefined,
  placeholder: string,
  dateFormat: string,
): string {
  if (!range?.from) return placeholder;
  if (!range.to) return `Từ ${format(range.from, dateFormat, { locale: vi })}`;
  return `${format(range.from, dateFormat, { locale: vi })} - ${format(range.to, dateFormat, { locale: vi })}`;
}

export function DashDateRangePicker({
  value,
  onValueChange,
  placeholder = 'Chọn khoảng ngày',
  disabled,
  className,
  triggerClassName,
  dateFormat = 'dd/MM/yyyy',
  align = 'end',
}: DashDateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (range: DateRange | undefined) => {
    onValueChange?.(range);
    if (range?.from && range?.to) setOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface shadow-sm transition-colors outline-none',
            'hover:bg-surface-container focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value?.from && 'text-muted-foreground',
            triggerClassName,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <span className="truncate text-left">{formatRange(value, placeholder, dateFormat)}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-on-surface-variant" />
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0 text-[10px] [&_*]:text-[10px]!"
        >
          <div className="flex flex-wrap gap-1 border-b border-outline p-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onValueChange?.(preset.getRange());
                  setOpen(false);
                }}
                className="rounded-md border border-outline bg-surface px-2.5 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <Calendar
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={2}
            locale={vi}
            weekStartsOn={1}
          />
          <div className="flex items-center justify-between gap-4 border-t border-outline px-3 py-2">
            <span className="text-[11px] font-medium text-on-surface-variant">
              {formatRange(value, placeholder, dateFormat)}
            </span>
            <button
              type="button"
              onClick={() => {
                onValueChange?.(undefined);
                setOpen(false);
              }}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Xóa
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
