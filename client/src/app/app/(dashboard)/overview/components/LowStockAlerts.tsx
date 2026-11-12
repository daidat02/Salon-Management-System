import Link from 'next/link';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LowStockProduct } from '@/types/overview';

type LowStockAlertsProps = {
  items: LowStockProduct[];
};

export default function LowStockAlerts({ items }: LowStockAlertsProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-outline bg-surface p-6 shadow-sm">
      <div>
        <div className="flex items-center justify-between border-b border-outline pb-3">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-warning" />
            <h2 className="text-base font-semibold text-on-surface">Cảnh báo tồn kho</h2>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-warning">
            {items.length} sản phẩm
          </span>
        </div>

        {items.length === 0 ? (
          <p className="mt-6 text-xs text-on-surface-variant">
            Không có sản phẩm nào dưới mức tồn an toàn.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => {
              const percent =
                item.safeLevel > 0
                  ? Math.min(100, Math.round((item.stock / item.safeLevel) * 100))
                  : 0;
              const isCritical = percent < 20;

              return (
                <div key={item.id}>
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="line-clamp-1 font-medium text-on-surface">{item.name}</span>
                    <span
                      className={cn(
                        'whitespace-nowrap font-bold',
                        isCritical ? 'text-error' : 'text-warning',
                      )}
                    >
                      Còn {item.stock} {item.unit}
                    </span>
                  </div>
                  <div className="mb-1.5 mt-1 flex items-center justify-between text-[11px] text-on-surface-variant">
                    <span>Mức an toàn: {item.safeLevel}</span>
                    <span
                      className={cn(
                        'font-semibold',
                        isCritical ? 'text-error' : 'text-warning',
                      )}
                    >
                      {percent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-outline-variant">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        isCritical ? 'bg-error' : 'bg-warning',
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-outline pt-4">
        <Link
          href="/inventory/inbound"
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-brand-hover"
        >
          <span>+ Nhập kho ngay</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
