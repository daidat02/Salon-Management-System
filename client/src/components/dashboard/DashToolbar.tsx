'use client';

import * as React from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from 'cn';
import type { DateRange } from 'react-day-picker';
import { DashDatePicker } from '@/components/dashboard/DashDatePicker';
import { DashDateRangePicker } from '@/components/dashboard/DashDateRangePicker';

export type ToolbarFilterOption = string | { label: string; value: string };

export type ToolbarFilter = {
  id: string;
  placeholder: string;
  options: ToolbarFilterOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  widthClass?: string;
};

type ToolbarDateFilterBase = {
  placeholder?: string;
  widthClass?: string;
};

/** `range: false` (mặc định) = chọn 1 ngày; `range: true` = chọn khoảng ngày. */
export type ToolbarDateFilter =
  | (ToolbarDateFilterBase & {
      range?: false;
      value?: Date;
      onValueChange?: (date: Date | undefined) => void;
    })
  | (ToolbarDateFilterBase & {
      range: true;
      value?: DateRange;
      onValueChange?: (range: DateRange | undefined) => void;
    });

type DashToolbarProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  dateFilter?: ToolbarDateFilter;
  filters?: ToolbarFilter[];
  onRefresh?: () => void;
  onReset?: () => void;
  className?: string;
};

function normalizeOption(opt: ToolbarFilterOption): { label: string; value: string } {
  if (typeof opt === 'string') return { label: opt, value: opt };
  return opt;
}
export default function DashToolbar({
  searchPlaceholder = 'Tìm kiếm...',
  searchValue,
  onSearchChange,
  dateFilter,
  filters = [],
  onRefresh,
  onReset,
  className,
}: DashToolbarProps) {
  const [internalSearch, setInternalSearch] = React.useState(searchValue ?? '');
  const [prevSearchValue, setPrevSearchValue] = React.useState(searchValue);
  const singleDateFilter = dateFilter?.range === true ? undefined : dateFilter;
  const rangeDateFilter = dateFilter?.range === true ? dateFilter : undefined;
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(singleDateFilter?.value);
  const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(
    rangeDateFilter?.value,
  );
  const [refreshSpinKey, setRefreshSpinKey] = React.useState(0);

  if (searchValue !== prevSearchValue) {
    setPrevSearchValue(searchValue);
    setInternalSearch(searchValue ?? '');
  }

  const handleSearch = (v: string) => {
    if (searchValue === undefined) setInternalSearch(v);
    onSearchChange?.(v);
  };

  const isDateControlled = singleDateFilter?.onValueChange !== undefined;
  const dateValue = isDateControlled ? singleDateFilter?.value : internalDate;

  const handleDateChange = (date: Date | undefined) => {
    if (!isDateControlled) setInternalDate(date);
    singleDateFilter?.onValueChange?.(date);
  };

  const isRangeControlled = rangeDateFilter?.onValueChange !== undefined;
  const rangeValue = isRangeControlled ? rangeDateFilter?.value : internalRange;

  const handleRangeChange = (range: DateRange | undefined) => {
    if (!isRangeControlled) setInternalRange(range);
    rangeDateFilter?.onValueChange?.(range);
  };

  const handleRefresh = () => {
    setRefreshSpinKey((key) => key + 1);
    onRefresh?.();
  };

  return (
    <section
      className={cn(
        'bg-surface flex flex-col gap-3 rounded-md border border-outline p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between',
        className,
      )}
    >
      <div className="flex w-full flex-1 flex-col items-center gap-2.5 sm:flex-row lg:w-auto">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <Search className="h-3.5 w-3.5" />
          </span>
          <Input
            value={internalSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-surface-container border-outline placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-primary/30 h-8 w-full rounded-md border py-2 pr-3 pl-8 text-xs placeholder:text-xs focus-visible:ring-1"
          />
        </div>

        {/* Date filter - ngay sau search */}
        {dateFilter && (
          <div className={cn('w-full', dateFilter.widthClass ?? 'sm:w-44')}>
            {rangeDateFilter ? (
              <DashDateRangePicker
                value={rangeValue}
                onValueChange={handleRangeChange}
                placeholder={rangeDateFilter.placeholder ?? 'Tất cả ngày'}
                className="w-full"
                triggerClassName="bg-surface-container border-outline h-8 w-full rounded-md px-3 py-2 text-xs shadow-none"
              />
            ) : (
              <DashDatePicker
                value={dateValue}
                onValueChange={handleDateChange}
                placeholder={dateFilter.placeholder ?? 'Tất cả ngày'}
                triggerClassName="bg-surface-container border-outline h-8 rounded-md px-3 py-2 text-xs"
              />
            )}
          </div>
        )}

        {/* Filters - hiển thị label, value dùng để lưu */}
        {filters.map((filter) => {
          const normalized = filter.options.map(normalizeOption);
          const valueToLabel = new Map(normalized.map((o) => [o.value, o.label] as const));
          const labelToValue = new Map(normalized.map((o) => [o.label, o.value] as const));
          const displayValue = filter.value
            ? (valueToLabel.get(filter.value) ?? filter.value)
            : null;
          return (
            <div key={filter.id} className={cn('relative w-full', filter.widthClass ?? 'sm:w-44')}>
              <Select
                value={displayValue}
                onValueChange={(label) => {
                  const actualValue = label ? (labelToValue.get(label) ?? label) : '';
                  filter.onValueChange?.(actualValue);
                }}
              >
                <SelectTrigger
                  size="default"
                  className="bg-surface-container border-outline text-on-surface focus-visible:border-primary focus-visible:ring-primary/30 h-8 w-full rounded-md border px-3 py-2 text-xs focus-visible:ring-1 data-placeholder:text-on-surface-variant"
                >
                  <SelectValue placeholder={filter.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {normalized.map(({ label }) => (
                    <SelectItem key={label} value={label} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleRefresh}
          title="Làm mới dữ liệu"
          className="border-outline text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-md border"
        >
          <RefreshCw
            key={refreshSpinKey}
            className={cn('h-4.5 w-4.5', refreshSpinKey > 0 && 'animate-spin')}
            style={
              refreshSpinKey > 0
                ? { animationDuration: '0.6s', animationIterationCount: 1 }
                : undefined
            }
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="border-outline text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          Đặt lại bộ lọc
        </Button>
      </div>
    </section>
  );
}
