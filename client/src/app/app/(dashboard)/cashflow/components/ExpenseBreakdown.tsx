'use client';

import * as React from 'react';
import { BadgeCheck, Settings } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import TextButton from '@/components/dashboard/TextButton';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import useCategoryExpenseStats from '@/hooks/use-category-expense-stats';
import { formatVND } from '@/lib/format';
import { cn } from 'cn';
import CategorySettingsDialog from './CategorySettingsDialog';

const PROGRESS_COLORS = [
  'bg-primary',
  'bg-indigo-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-slate-400',
  'bg-rose-500',
];

function formatMonth(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return 'tháng này';
  return new Intl.DateTimeFormat('vi-VN', { month: 'long' }).format(date);
}

export default function ExpenseBreakdown() {
  const searchParams = useSearchParams();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const dateFrom = searchParams.get('date_from') || undefined;
  const dateTo = searchParams.get('date_to') || undefined;
  const { data: categories = [], isLoading } = useCategoryExpenseStats({ dateFrom, dateTo });

  const slices = categories
    .filter(
      (category) =>
        category.category_type === 'operating_expense' && category.total_expense > 0,
    )
    .sort((a, b) => b.total_expense - a.total_expense);
  const totalExpense = slices.reduce((sum, category) => sum + category.total_expense, 0);

  return (
    <>
      <div className="flex flex-col justify-between rounded-xl border border-outline bg-surface p-6 shadow-sm">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-on-surface">
              Tỷ trọng Chi phí {formatMonth(dateFrom)}
            </h2>
            <TextButton
              icon={Settings}
              onClick={() => setSettingsOpen(true)}
              aria-haspopup="dialog"
            >
              Cài đặt danh mục
            </TextButton>
          </div>
          <p className="mb-4 text-xs text-on-surface-variant">
            Phân bổ chi phí vận hành theo danh mục từ dữ liệu thực tế
          </p>

          {isLoading ? (
            <div className="space-y-3.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="h-2 w-full animate-pulse rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : slices.length === 0 ? (
            <p className="rounded-lg border border-dashed border-outline px-3 py-6 text-center text-xs text-on-surface-variant">
              Chưa có chi phí vận hành trong kỳ
            </p>
          ) : (
            <div className="space-y-3.5">
              {slices.map((slice, index) => {
                const percent = Math.round((slice.total_expense / totalExpense) * 100);
                return (
                  <div key={slice.id}>
                    <div className="mb-1 flex justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-on-surface">{slice.name}</span>
                      <span className="shrink-0 font-semibold text-on-surface">
                        {percent}%{' '}
                        <span className="text-[11px] font-normal text-on-surface-variant">
                          ({formatVND(slice.total_expense)})
                        </span>
                      </span>
                    </div>
                    <Progress value={percent} className="gap-0">
                      <ProgressTrack className="h-2 bg-slate-100">
                        <ProgressIndicator
                          className={cn(
                            'h-full rounded-full',
                            PROGRESS_COLORS[index % PROGRESS_COLORS.length],
                          )}
                        />
                      </ProgressTrack>
                    </Progress>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-200/60 bg-emerald-50 p-3">
          <BadgeCheck className="h-5 w-5 shrink-0 text-success" />
          <p className="text-xs font-medium text-emerald-800">
            Tổng chi phí vận hành trong kỳ: {formatVND(totalExpense)}
          </p>
        </div>
      </div>

      <CategorySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </>
  );
}
