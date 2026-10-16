import { BadgeCheck } from 'lucide-react';
import { Progress, ProgressIndicator, ProgressTrack } from '@/components/ui/progress';
import { formatVND } from '@/lib/format';
import { EXPENSE_SLICES } from './cashflowData';
import { cn } from 'cn';

export default function ExpenseBreakdown() {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline bg-surface p-6 shadow-sm">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-on-surface">Tỷ trọng Chi phí tháng 10</h2>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            Tổng: 28.5M
          </span>
        </div>
        <p className="mb-4 text-xs text-on-surface-variant">
          Phân bổ ngân sách theo danh mục hoạt động
        </p>
        <div className="space-y-3.5">
          {EXPENSE_SLICES.map((slice) => (
            <div key={slice.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-on-surface">{slice.label}</span>
                <span className="font-semibold text-on-surface">
                  {slice.percent}%{' '}
                  <span className="text-[11px] font-normal text-on-surface-variant">
                    ({formatVND(slice.amount)})
                  </span>
                </span>
              </div>
              <Progress value={slice.percent} className="gap-0">
                <ProgressTrack className="h-2 bg-slate-100">
                  <ProgressIndicator className={cn('h-full rounded-full', slice.colorClass)} />
                </ProgressTrack>
              </Progress>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-emerald-200/60 bg-emerald-50 p-3">
        <BadgeCheck className="h-5 w-5 shrink-0 text-success" />
        <p className="text-xs font-medium text-emerald-800">
          Hạn mức chi phí an toàn: đang ở mức 68% (&lt;85% ngân sách dự toán)
        </p>
      </div>
    </div>
  );
}
