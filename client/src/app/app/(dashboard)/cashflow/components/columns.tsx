import { ArrowDown, ArrowUp, Check, Eye, MoreVertical, Printer } from 'lucide-react';
import type { DashColumn } from '@/components/dashboard/DashTable';
import { Tag } from '@/components/ui/tag';
import { formatVND } from '@/lib/format';
import { cn } from 'cn';
import type { CashflowVoucher, CashflowStatus } from './types';
import { CASHFLOW_STATUS_LABELS } from './cashflowUtils';

const STATUS_VARIANTS: Record<
  CashflowStatus,
  'success' | 'warning' | 'error'
> = {
  approved: 'success',
  pending: 'warning',
  cancelled: 'error',
};

type BuildCashflowColumnsOptions = {
  onApprove?: (row: CashflowVoucher) => void;
};

export function buildCashflowColumns({
  onApprove,
}: BuildCashflowColumnsOptions = {}): DashColumn<CashflowVoucher>[] {
  return [
    {
      id: 'date',
      header: 'Ngày',
      className: 'whitespace-nowrap',
      cell: (row) => (
        <div>
          <div className="font-medium text-on-surface">{row.date}</div>
          <div className="text-[10px] text-on-surface-variant">{row.time}</div>
        </div>
      ),
    },
    {
      id: 'code',
      header: 'Mã phiếu',
      className: 'whitespace-nowrap font-semibold text-primary',
      cell: (row) => <span className="cursor-pointer hover:underline">{row.code}</span>,
    },
    {
      id: 'type',
      header: 'Loại',
      className: 'whitespace-nowrap',
      cell: (row) =>
        row.type === 'income' ? (
          <Tag variant="success" shape="pill" size="md">
            <ArrowDown className="h-3 w-3" />
            Thu
          </Tag>
        ) : (
          <Tag variant="error" shape="pill" size="md">
            <ArrowUp className="h-3 w-3" />
            Chi
          </Tag>
        ),
    },
    {
      id: 'category',
      header: 'Danh mục',
      className: 'whitespace-nowrap font-medium text-on-surface',
      cell: (row) => row.category,
    },
    {
      id: 'description',
      header: 'Diễn giải',
      className: 'max-w-xs text-on-surface-variant',
      cell: (row) => (
        <span className="block truncate" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      id: 'fund',
      header: 'Quỹ',
      className: 'whitespace-nowrap text-on-surface',
      cell: (row) => row.fund,
    },
    {
      id: 'amount',
      header: 'Số tiền',
      headerClassName: 'text-right',
      className: 'whitespace-nowrap text-right font-bold',
      cell: (row) => (
        <span className={cn(row.type === 'income' ? 'text-success' : 'text-error')}>
          {row.type === 'income' ? '+' : '-'}
          {formatVND(row.amount)}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      headerClassName: 'text-center',
      className: 'whitespace-nowrap text-center',
      cell: (row) => (
        <Tag variant={STATUS_VARIANTS[row.status]} shape="rounded" size="sm">
          {CASHFLOW_STATUS_LABELS[row.status]}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      headerClassName: 'text-center',
      className: 'whitespace-nowrap text-center',
      cell: (row) => (
        <div className="flex items-center justify-center gap-1 text-slate-400">
          {row.status === 'pending' && onApprove && (
            <button
              data-testid={`cashflow-approve-${row.code}`}
              type="button"
              title="Duyệt phiếu"
              aria-label={`Duyệt phiếu ${row.code}`}
              onClick={(event) => {
                event.stopPropagation();
                onApprove(row);
              }}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button type="button" title="Xem chi tiết" className="rounded p-1 hover:bg-slate-100 hover:text-primary">
            <Eye className="h-4 w-4" />
          </button>
          <button type="button" title="In phiếu" className="rounded p-1 hover:bg-slate-100 hover:text-on-surface">
            <Printer className="h-4 w-4" />
          </button>
          <button type="button" title="Thao tác khác" className="rounded p-1 hover:bg-slate-100 hover:text-on-surface">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];
}
