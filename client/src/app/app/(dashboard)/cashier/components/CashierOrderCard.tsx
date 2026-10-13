'use client';

import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Eye,
  Hourglass,
  Phone,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import type { Order, OrderStatus } from '@/types/order';

const statusMeta: Record<
  OrderStatus,
  { label: string; variant: 'warning' | 'teal' | 'purple' | 'success' | 'slate' | 'gray' | 'error' }
> = {
  pending: { label: 'Chờ xử lý', variant: 'warning' },
  confirm: { label: 'Đã xác nhận', variant: 'teal' },
  delivery: { label: 'Đang giao', variant: 'purple' },
  completed: { label: 'Hoàn tất', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'gray' },
  refunded: { label: 'Đã hoàn tiền', variant: 'error' },
};

const AVATAR_BG = [
  'bg-primary-container text-primary',
  'bg-amber-100 text-amber-800',
  'bg-slate-200 text-slate-800',
  'bg-rose-100 text-rose-700',
  'bg-blue-100 text-primary',
  'bg-emerald-100 text-emerald-800',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarBg(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_BG[hash % AVATAR_BG.length];
}

function formatVND(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function formatHour(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export type CashierCustomer = { name: string; phone: string };

export default function CashierOrderCard({
  order,
  customer,
}: {
  order: Order;
  customer?: CashierCustomer;
}) {
  const router = useRouter();
  const meta = statusMeta[order.status] ?? { label: order.status, variant: 'slate' as const };
  const name = customer?.name ?? 'Khách lẻ (Walk-in)';
  const phone = customer?.phone ?? '';
  const isCompleted = order.status === 'completed';

  const goDetail = () => router.push(`/app/orders/${order.id}`);

  return (
    <div
      onClick={goDetail}
      className="group flex cursor-pointer flex-col justify-between rounded-xl border border-outline bg-surface p-4 transition-all duration-200 hover:border-primary hover:shadow-md"
    >
      <div>
        {/* Header: mã + trạng thái — theo preview/code.html */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <span className="rounded bg-surface-container px-2 py-0.5 font-mono text-xs font-bold text-on-surface-variant">
            {order.code}
          </span>
          <Tag variant={meta.variant} shape="pill" size="md" dot>
            {meta.label}
          </Tag>
        </div>

        {/* Khách hàng */}
        <div className="mt-3 flex items-start gap-3">
          <div
            className={cn(
              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold',
              avatarBg(order.id),
            )}
          >
            {initials(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="truncate text-sm font-semibold text-on-surface">{name}</h4>
              <span className="shrink-0 text-[11px] font-medium text-on-surface-variant">
                {formatHour(order.created_at)}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-on-surface-variant">
              {phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {phone}
                </span>
              ) : (
                <span className="italic text-on-surface-variant/70">Chưa có SĐT</span>
              )}
              <span>•</span>
              <span className="font-medium text-primary">Quầy thu ngân</span>
            </div>
          </div>
        </div>

        {/* Tóm tắt dịch vụ */}
        <div className="mt-3 space-y-1 rounded-lg bg-surface-container p-2.5 text-xs text-on-surface">
          <div className="flex items-start gap-1.5">
            {isCompleted ? (
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            ) : (
              <Hourglass className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            <span className="font-medium">
              Tạm tính {formatVND(order.subtotal_amount)}
              {order.discount_amount > 0 && (
                <span className="text-success"> • Giảm {formatVND(order.discount_amount)}</span>
              )}
            </span>
          </div>
        </div>

        {/* Người phục vụ */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Receipt className="h-3.5 w-3.5" />
          <span>
            Cập nhật:{' '}
            <strong className="font-semibold text-on-surface">
              {formatHour(order.updated_at)}
            </strong>
          </span>
        </div>
      </div>

      {/* Tổng + CTA */}
      <div className="mt-4 flex items-center justify-between border-t border-outline pt-3">
        <div>
          <span className="block text-[11px] text-on-surface-variant">
            {isCompleted ? 'Tổng thanh toán' : 'Tổng dự kiến'}
          </span>
          <span className="text-base font-bold text-on-surface">
            {formatVND(order.total_amount)}
          </span>
        </div>
        {isCompleted ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goDetail();
            }}
            className="flex items-center gap-1 rounded-lg border border-outline px-3.5 py-1.5 text-xs font-semibold text-on-surface transition-all duration-150 hover:bg-surface-container"
          >
            <Eye className="h-4 w-4" />
            Chi tiết
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              goDetail();
            }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-on-primary shadow-sm transition-all duration-150 hover:bg-primary-dark active:scale-95"
          >
            <Wallet className="h-4 w-4" />
            Thu tiền ngay
          </button>
        )}
      </div>
    </div>
  );
}
