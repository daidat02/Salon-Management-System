'use client';

import * as React from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from 'cn';

export type DashComboboxOption = string | { label: string; value: string };

type DashComboboxProps = {
  options: DashComboboxOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
};

function normalizeOptions(options: DashComboboxOption[]) {
  return options.map((opt) =>
    typeof opt === 'string' ? { label: opt, value: opt } : opt,
  );
}

export function DashCombobox({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = 'Chọn...',
  emptyMessage = 'Không tìm thấy kết quả.',
  disabled,
  name,
  id,
  className,
  inputClassName,
}: DashComboboxProps) {
  const normalized = normalizeOptions(options);
  const selected = value
    ? (normalized.find((opt) => opt.value === value) ?? null)
    : null;
  const defaultSelected = defaultValue
    ? (normalized.find((opt) => opt.value === defaultValue) ?? null)
    : null;

  return (
    <Combobox.Root
      items={normalized}
      value={selected}
      defaultValue={defaultSelected}
      onValueChange={(item) => onValueChange?.(item?.value ?? '')}
      isItemEqualToValue={(a, b) => a.value === b.value}
      itemToStringLabel={(item) => item.label}
      itemToStringValue={(item) => item.value}
      autoHighlight
      disabled={disabled}
      name={name}
    >
      <Combobox.InputGroup className={cn('relative w-full', className)}>
        <Combobox.Input
          id={id}
          placeholder={placeholder}
          className={cn(
            'h-9 w-full min-w-0 rounded-lg border border-outline bg-surface px-3 pr-14 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50',
            inputClassName,
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
          <Combobox.Clear
            aria-label="Xóa lựa chọn"
            className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-3.5" />
          </Combobox.Clear>
          <Combobox.Trigger
            aria-label="Mở danh sách"
            className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors"
          >
            <ChevronsUpDown className="size-3.5" />
          </Combobox.Trigger>
        </div>
      </Combobox.InputGroup>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50 outline-none">
          <Combobox.Popup
            className={cn(
              'bg-popover text-popover-foreground relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg p-1 shadow-md ring-1 ring-foreground/10 duration-100',
              'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
              'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            )}
          >
            <Combobox.Empty>
              <div className="text-muted-foreground px-2 py-2 text-xs">{emptyMessage}</div>
            </Combobox.Empty>
            <Combobox.List>
              {(item: { label: string; value: string }) => (
                <Combobox.Item
                  key={item.value}
                  value={item}
                  className={cn(
                    'relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-1.5 text-xs outline-hidden select-none',
                    'data-highlighted:bg-accent data-highlighted:text-accent-foreground',
                    'data-disabled:pointer-events-none data-disabled:opacity-50',
                  )}
                >
                  <Combobox.ItemIndicator
                    render={
                      <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
                    }
                  >
                    <Check className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="flex-1 truncate">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export default DashCombobox;
