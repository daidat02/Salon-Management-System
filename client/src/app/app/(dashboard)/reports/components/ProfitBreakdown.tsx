import { cn } from 'cn';
import { Tag } from '@/components/ui/tag';
import { formatVND } from '@/lib/format';
import type { ProfitBreakdownItem } from '@/types/report';

type ProfitBreakdownProps = {
  items: ProfitBreakdownItem[];
};

const TONE_STYLES: Record<
  ProfitBreakdownItem['tone'],
  { row: string; amount: string; bar: string }
> = {
  revenue: {
    row: '',
    amount: 'text-on-surface',
    bar: 'bg-primary',
  },
  cost: {
    row: '',
    amount: 'text-error',
    bar: 'bg-rose-300',
  },
  subtotal: {
    row: 'border border-outline bg-surface-container-low',
    amount: 'text-on-surface',
    bar: 'bg-slate-400',
  },
  profit: {
    row: 'border border-emerald-200 bg-emerald-50/70',
    amount: 'text-success',
    bar: 'bg-success',
  },
};

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export default function ProfitBreakdown({ items }: ProfitBreakdownProps) {
  return (
    <section
      id="profit-breakdown"
      className="scroll-mt-24 rounded-xl border border-outline bg-surface p-5 shadow-sm lg:col-span-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-outline pb-3">
        <div>
          <h2 className="text-base font-bold text-on-surface">
            Phân rã Lợi nhuận
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Từ doanh thu đến lợi nhuận thuần trong kỳ
          </p>
        </div>
        <Tag variant="primary" size="sm">
          DT − giá vốn − hoa hồng − vận hành
        </Tag>
      </div>

      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const styles = TONE_STYLES[item.tone];
          const isCost = item.tone === 'cost';

          return (
            <div
              key={item.id}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-lg px-3 py-2.5',
                styles.row,
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-xs',
                      item.tone === 'profit'
                        ? 'font-bold text-on-surface'
                        : 'font-medium text-on-surface',
                    )}
                  >
                    {item.label}
                  </span>
                  {item.tone === 'subtotal' && (
                    <Tag variant="slate" size="sm">
                      Tạm tính
                    </Tag>
                  )}
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
                  <div
                    className={cn('h-full rounded-full', styles.bar)}
                    style={{ width: `${clamp(item.ratio)}%` }}
                  />
                </div>
              </div>

              <div className="min-w-[116px] text-right">
                <div className={cn('text-sm font-bold', styles.amount)}>
                  {isCost ? '−' : ''}
                  {formatVND(item.amount)}
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  {item.ratio.toFixed(1)}% doanh thu
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 border-t border-outline pt-3 text-[11px] text-on-surface-variant">
        Lợi nhuận thuần = Doanh thu − Giá vốn vật tư − Hoa hồng nhân viên − Chi
        phí vận hành
      </div>
    </section>
  );
}
