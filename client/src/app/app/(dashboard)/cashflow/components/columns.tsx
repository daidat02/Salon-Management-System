import { ArrowDown, ArrowUp, Eye, MoreVertical, Printer } from 'lucide-react';
import type { DashColumn } from '@/components/dashboard/DashTable';
import { Tag } from '@/components/ui/tag';
import { formatVND } from '@/lib/format';
import { cn } from 'cn';
import type { CashflowVoucher } from './types';

export function buildCashflowColumns(): DashColumn<CashflowVoucher>[] {
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
        row.type === 'thu' ? (
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
      id: 'creator',
      header: 'Người tạo',
      className: 'whitespace-nowrap text-on-surface',
      cell: (row) => row.creator,
    },
    {
      id: 'amount',
      header: 'Số tiền',
      headerClassName: 'text-right',
      className: 'whitespace-nowrap text-right font-bold',
      cell: (row) => (
        <span className={cn(row.type === 'thu' ? 'text-success' : 'text-error')}>
          {row.type === 'thu' ? '+' : '-'}
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
        <Tag variant={row.status === 'Đã duyệt' ? 'success' : 'warning'} shape="rounded" size="sm">
          {row.status}
        </Tag>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      headerClassName: 'text-center',
      className: 'whitespace-nowrap text-center',
      cell: () => (
        <div className="flex items-center justify-center gap-1 text-slate-400">
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
