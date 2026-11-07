'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { cn } from 'cn';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type DashDatePickerProps = {
  value?: Date;
  onValueChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  /** date-fns format, mặc định dd/MM/yyyy */
  dateFormat?: string;
  disableFuture?: boolean;
  /** Hiện nút X để xóa ngày đã chọn. */
  clearable?: boolean;
};

export function DashDatePicker({
  value,
  onValueChange,
  placeholder = 'Chọn ngày...',
  disabled,
  className,
  triggerClassName,
  dateFormat = 'dd/MM/yyyy',
  disableFuture,
  clearable,
}: DashDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
          className={cn(
            // Đồng bộ với DashInput/DashSelect: h-9, cùng border, bg, text, focus
            'flex h-9 w-full items-center gap-2 rounded-md border border-outline bg-surface px-3 py-2 text-sm text-on-surface transition-colors outline-none',
            'focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            clearable && value && 'pr-9',
            triggerClassName,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-on-surface-variant" />
          <span className="flex-1 truncate text-left">
            {value ? format(value, dateFormat, { locale: vi }) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-on-surface-variant" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0 text-[10px] [&_*]:text-[10px]!"
        >
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => {
              onValueChange?.(date);
              setOpen(false);
            }}
            locale={vi}
            weekStartsOn={1}
            captionLayout="dropdown"
            disabled={disableFuture ? { after: new Date() } : undefined}
          />
        </PopoverContent>
      </Popover>
      {clearable && value && (
        <button
          type="button"
          aria-label="Xóa ngày"
          onClick={() => onValueChange?.(undefined)}
          className="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-on-surface-variant transition-colors hover:text-error"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
