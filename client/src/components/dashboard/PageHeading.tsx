import Link from 'next/link';
import type { MouseEvent } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PageHeadingBackButton from './PageHeadingBackButton';

export type PageHeadingBreadcrumb = {
  label: string;
  href?: string;
  /** Kiểu chữ primary cho trang hiện tại (như Danh mục trong preview). */
  active?: boolean;
};

export type PageHeadingActionVariant = 'outline' | 'primary' | 'link';

export type PageHeadingAction = {
  label: string;
  icon: LucideIcon;
  variant?: PageHeadingActionVariant;
  href?: string;
  onClick?: (e: MouseEvent) => void;
};

export type PageHeadingBackButton = {
  /** Text nút (mặc định "Quay lại"). */
  label?: string;
  /** Có href thì render Link, không thì router.back(). */
  href?: string;
};

export type PageHeadingDateRange = {
  /** Nhãn hiển thị, vd. "Tháng này (01/10 - 31/10/2024)". */
  label: string;
  onClick?: (e: MouseEvent) => void;
};

type PageHeadingProps = {
  breadcrumbs?: PageHeadingBreadcrumb[];
  title: string;
  subtitle?: React.ReactNode;
  /** Pill cạnh title, vd. "86 mặt hàng SKU". */
  badge?: string;
  /** container: bg-primary-container · soft: bg-primary/10 (như Thu Chi). */
  badgeVariant?: 'container' | 'soft';
  /** Tự style (mỗi preview một kiểu text-xs/text-sm khác nhau). */
  description?: React.ReactNode;
  actions?: PageHeadingAction[];
  /** Nút chọn khoảng ngày hiển thị cạnh cụm actions (vd. Thu Chi: "Tháng này..."). */
  dateRange?: PageHeadingDateRange;
  /** Component khoảng ngày tùy biến (ưu tiên hơn dateRange). */
  dateRangeContent?: React.ReactNode;
  /** Hiện nút quay lại phía trên heading. true = mặc định router.back(). */
  backButton?: boolean | PageHeadingBackButton;
};

/**
 * Page heading dùng chung cho các trang dashboard — mẫu từ
 * preview/admin_preview/content/kho-hang.html (dòng 1–33):
 * breadcrumb + title + badge + description + cụm action buttons.
 */
export default function PageHeading({
  breadcrumbs = [],
  title,
  subtitle,
  badge,
  badgeVariant = 'container',
  description,
  actions = [],
  dateRange,
  dateRangeContent,
  backButton = false,
}: PageHeadingProps) {
  const back = typeof backButton === 'object' && backButton !== null ? backButton : undefined;
  const showBack = backButton === true || back !== undefined;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        {showBack && (
          <PageHeadingBackButton label={back?.label} href={back?.href} />
        )}
        {breadcrumbs.length > 0 && (
          <nav className="mb-1 flex items-center gap-2 text-xs text-on-surface-variant">
            {breadcrumbs.map((crumb, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <span key={crumb.label} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                  {isLast || !crumb.href ? (
                    <span
                      className={cn(
                        'font-medium text-on-surface',
                        crumb.active && 'font-semibold text-primary',
                      )}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="transition-colors hover:text-primary">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              );
            })}
          </nav>
        )}

        <div className="flex items-baseline gap-3">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface">
            {title}
          </h1>
          {badge && (
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-xs text-primary',
                badgeVariant === 'container'
                  ? 'bg-primary-container font-medium'
                  : 'bg-primary/10 font-semibold',
              )}
            >
              {badge}
            </span>
          )}
        </div>

        {subtitle !== undefined ? (
          typeof subtitle === 'string' ? (
            <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
          ) : (
            subtitle
          )
        ) : null}
        {description}
      </div>

      {(actions.length > 0 || dateRange || dateRangeContent) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {dateRangeContent
            ? dateRangeContent
            : dateRange && (
                <button
                  type="button"
                  onClick={dateRange.onClick}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline bg-surface px-3 py-2 text-xs text-on-surface shadow-sm transition-colors hover:bg-surface-container"
                >
                  <CalendarDays className="h-4 w-4 text-on-surface-variant" />
                  <span className="font-medium">{dateRange.label}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />
                </button>
              )}
          {actions.map((action) => {
            const Icon = action.icon;
            if (action.variant === 'link') {
              return (
                <Link
                  key={action.label}
                  href={action.href ?? '#'}
                  onClick={action.onClick}
                  className="mr-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Icon className="h-4 w-4" />
                  <span>{action.label}</span>
                </Link>
              );
            }
            const isPrimary = action.variant === 'primary';
            return (
              <Button
                key={action.label}
                variant={isPrimary ? 'default' : 'outline'}
                onClick={action.onClick}
                className={cn(
                  'h-auto rounded-md px-3.5 py-2 text-xs shadow-sm',
                  isPrimary ? 'font-semibold' : 'bg-surface hover:bg-surface-container',
                )}
              >
                <Icon
                  className={cn(isPrimary ? 'h-4.5 w-4.5' : 'h-4 w-4 text-on-surface-variant')}
                />
                <span>{action.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
