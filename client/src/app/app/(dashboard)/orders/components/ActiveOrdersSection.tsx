'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Clock3, Plus, Receipt } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/services/apiClient';
import { getOrdersByOrgID } from '@/services/order';
import useCustomer from '@/hooks/use-customer';
import type { Order, OrderStatus } from '@/types/order';
import { formatDateTime, formatVND } from '@/lib/format';

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirm', 'delivery'];
export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'refunded'];

const statusMeta: Record<
  OrderStatus,
  { label: string; variant: 'success' | 'warning' | 'purple' | 'teal' | 'gray' | 'error' }
> = {
  pending: { label: 'Chờ xử lý', variant: 'warning' },
  confirm: { label: 'Đã xác nhận', variant: 'teal' },
  delivery: { label: 'Đang giao', variant: 'purple' },
  completed: { label: 'Hoàn tất', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'gray' },
  refunded: { label: 'Đã hoàn tiền', variant: 'error' },
};

const ACTIVE_LIMIT = 8;

export default function ActiveOrdersSection() {
  const router = useRouter();
  const [expanded, setExpanded] = React.useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () => getOrdersByOrgID({ page: 1, pageSize: 50 }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
  });

  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 });
  const customerMap = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>();
    for (const c of customerData?.data ?? []) {
      if (c) map.set(c.id, { name: c.full_name, phone: c.phone });
    }
    return map;
  }, [customerData]);

  const active = React.useMemo(() => {
    const rows = (data?.data ?? []).filter((r): r is Order => r !== null && r !== undefined);
    return rows
      .filter((r) => ACTIVE_STATUSES.includes(r.status))
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
  }, [data]);

  const visible = expanded ? active : active.slice(0, ACTIVE_LIMIT);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        {/* <div>
          <h2 className="text-sm font-bold text-on-surface">Đơn hàng hiện tại</h2>
          <p className="text-[11px] text-on-surface-variant">
            Theo dõi các phiếu nhập, xuất, điều chỉnh và bán hàng liên quan đến tồn kho.
          </p>
        </div> */}
        {/* <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-7 px-2 text-xs text-on-surface-variant hover:text-primary"
          >
            Làm mới
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/cashier/pos')}
            className="h-7 px-2.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Tạo đơn
          </Button>
        </div> */}
      </div>

      {isError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được đơn cần xử lý: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm
          tra kết nối API.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-md border border-outline bg-surface p-4">
              <div className="h-4 w-24 rounded bg-surface-container" />
              <div className="mt-2 h-3 w-32 rounded bg-surface-container" />
              <div className="mt-3 h-5 w-20 rounded-full bg-surface-container" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && active.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-outline bg-surface p-6 text-center">
          <Clock3 className="h-6 w-6 text-on-surface-variant" />
          <p className="text-sm font-medium text-on-surface">Không có đơn cần xử lý</p>
          <p className="text-xs text-on-surface-variant">
            Tất cả đơn đã hoàn tất — tạo đơn mới cho khách tại quầy.
          </p>
          <Button size="sm" onClick={() => router.push('/cashier/pos')} className="mt-1">
            <Plus className="h-3.5 w-3.5" />
            Tạo đơn mới
          </Button>
        </div>
      )}

      {!isLoading && !isError && active.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((order) => {
              const customer = order.customer_id ? customerMap.get(order.customer_id) : undefined;
              const meta = statusMeta[order.status] ?? {
                label: order.status,
                variant: 'slate' as const,
              };
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="group rounded-md border border-outline bg-surface p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-primary group-hover:underline">
                      {order.code}
                    </span>
                    <Tag variant={meta.variant} shape="pill" size="md" dot>
                      {meta.label}
                    </Tag>
                  </div>
                  <div className="mt-1.5 text-sm font-medium text-on-surface">
                    {customer?.name ?? 'Khách lẻ'}
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    {customer?.phone ?? '—'} · {formatDateTime(order.created_at)}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-on-surface">
                    {formatVND(order.total_amount)}
                  </div>
                </Link>
              );
            })}
          </div>
          {active.length > ACTIVE_LIMIT && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Thu gọn' : `Xem tất cả ${active.length} đơn`}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
