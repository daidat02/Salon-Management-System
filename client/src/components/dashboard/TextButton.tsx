'use client';

import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from 'cn';

type TextButtonProps = React.ComponentProps<'button'> & {
  icon?: LucideIcon;
  iconClassName?: string;
};

export default function TextButton({
  icon: Icon,
  iconClassName,
  className,
  children,
  ...props
}: TextButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'text-primary hover:text-primary/80 inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold underline-offset-2 hover:underline',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className={cn('size-3', iconClassName)} /> : null}
      {children}
    </button>
  );
}
