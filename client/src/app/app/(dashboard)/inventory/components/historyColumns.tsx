import Link from 'next/link';
import { Tag } from '@/components/ui/tag';
import type { DashColumn } from '@/components/dashboard/DashTable';
import type {
  InventoryDocument,
  InventoryDocumentType,
  InventoryPaymentStatus,
} from '@/types/inventory';
import { formatVND } from '@/lib/format';

const typeMeta: Record<
  InventoryDocumentType,
  { label: string; variant: 'success' | 'warning' | 'purple' | 'teal' | 'blue' }
> = {
  import: { label: 'Nhập kho', variant: 'success' },
  export: { label: 'Xuất kho', variant: 'warning' },
  adjust: { label: 'Điều chỉnh', variant: 'blue' },
  sale: { label: 'Bán hàng', variant: 'purple' },
  return: { label: 'Trả hàng', variant: 'teal' },
};

const paymentMeta: Record<
  InventoryPaymentStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'slate' }
> = {
  paid: { label: 'Đã trả hết', variant: 'success' },
  partial: { label: 'Trả một phần', variant: 'warning' },
  unpaid: { label: 'Chưa thanh toán', variant: 'error' },
  not_tracked: { label: 'Không theo dõi', variant: 'slate' },
};

function formatPartner(row: InventoryDocument): string {
  if (row.supplier_name) return row.supplier_name;
  if (row.order_code) return `Đơn ${row.order_code}`;
  return '—';
}

export const historyColumns: DashColumn<InventoryDocument>[] = [
  {
    id: 'document_code',
    header: 'Mã phiếu',
    className: 'font-mono text-primary font-semibold text-[11px] min-w-[130px]',
    cell: (row) => (
      <Link href={`/app/inventory/${row.id}`} className="hover:underline">
        {row.document_code}
      </Link>
    ),
  },
  {
    id: 'type',
    header: 'Loại phiếu',
    cell: (row) => {
      const meta = typeMeta[row.type] ?? { label: row.type, variant: 'slate' as const };
      return (
        <Tag variant={meta.variant} size="sm" shape="rounded">
          {meta.label}
        </Tag>
      );
    },
  },
  {
    id: 'partner',
    header: 'Nhà cung cấp / Đơn hàng',
    className: 'min-w-[200px]',
    cell: (row) => (
      <div>
        <div className="font-semibold text-on-surface">{formatPartner(row)}</div>
      </div>
    ),
  },
  {
    id: 'reason',
    header: 'Lý do',
    className: 'min-w-[200px]',
    cell: (row) => (
      <div className="line-clamp-1 text-[11px] text-on-surface-variant">{row.reason || '—'}</div>
    ),
  },
  {
    id: 'payment_status',
    header: 'Công nợ',
    className: 'min-w-[140px]',
    cell: (row) => {
      if (!row.payment_tracked) {
        return <span className="text-[11px] text-on-surface-variant">—</span>;
      }
      const meta = paymentMeta[row.payment_status] ?? paymentMeta.not_tracked;
      return (
        <div className="space-y-1">
          <Tag variant={meta.variant} size="sm" shape="rounded">
            {meta.label}
          </Tag>
          {row.remaining_amount > 0 && (
            <div className="text-[11px] font-medium text-error">
              Còn {formatVND(row.remaining_amount)} đ
            </div>
          )}
          {row.is_overdue && (
            <div className="text-[10px] font-semibold text-error">Quá hạn</div>
          )}
        </div>
      );
    },
  },
  {
    id: 'total_amount',
    header: 'Tổng tiền',
    className: 'text-right font-semibold text-primary whitespace-nowrap',
    cell: (row) => formatVND(row.total_amount),
  },
  {
    id: 'items_count',
    header: 'Số dòng',
    className: 'text-center',
    cell: (row) => <span className="font-medium">{row.items_count}</span>,
  },
  {
    id: 'created_by',
    header: 'Người tạo',
    cell: (row) => row.created_by_name ?? '—',
  },
  {
    id: 'created_at',
    header: 'Thời gian',
    className: 'text-right whitespace-nowrap',
    cell: (row) =>
      row.created_at
        ? new Date(row.created_at).toLocaleString('vi-VN', {
            dateStyle: 'short',
            timeStyle: 'short',
          })
        : '—',
  },
];
