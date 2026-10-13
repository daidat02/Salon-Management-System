'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Clock3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashToolbar from '@/components/dashboard/DashToolbar';
import { getApiErrorMessage } from '@/services/apiClient';
import { getOrdersByOrgID } from '@/services/order';
import useCustomer from '@/hooks/use-customer';
import type { Order, OrderStatus } from '@/types/order';
import CashierStats from './CashierStats';
import CashierOrderCard from './CashierOrderCard';

export const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirm', 'delivery'];

type TabKey = 'all' | 'pending' | 'confirm' | 'delivery';

function formatVND(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function isToday(value: string | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function CashierView() {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>('all');
  const [keyword, setKeyword] = React.useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['orders', 'cashier'],
    queryFn: () => getOrdersByOrgID({ page: 1, pageSize: 50 }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 });
  const customerMap = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>();
    for (const c of customerData?.data ?? []) {
      if (c) map.set(c.id, { name: c.full_name, phone: c.phone });
    }
    return map;
  }, [customerData]);

  const allRows = React.useMemo(
    () => (data?.data ?? []).filter((r): r is Order => r !== null && r !== undefined),
    [data],
  );

  const active = React.useMemo(
    () =>
      allRows
        .filter((r) => ACTIVE_STATUSES.includes(r.status))
        .sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        }),
    [allRows],
  );

  const counts = React.useMemo(
    () => ({
      all: active.length,
      pending: active.filter((o) => o.status === 'pending').length,
      confirm: active.filter((o) => o.status === 'confirm').length,
      delivery: active.filter((o) => o.status === 'delivery').length,
    }),
    [active],
  );

  const completedToday = React.useMemo(
    () =>
      allRows.filter((o) => o.status === 'completed' && isToday(o.updated_at ?? o.created_at)),
    [allRows],
  );

  const latestCompleted = React.useMemo(() => {
    const rows = allRows.filter((o) => o.status === 'completed');
    return rows.sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    })[0];
  }, [allRows]);

  const filtered = React.useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return active.filter((o) => {
      if (tab !== 'all' && o.status !== tab) return false;
      if (!kw) return true;
      const c = o.customer_id ? customerMap.get(o.customer_id) : undefined;
      return (
        o.code.toLowerCase().includes(kw) ||
        (c?.name ?? '').toLowerCase().includes(kw) ||
        (c?.phone ?? '').toLowerCase().includes(kw)
      );
    });
  }, [active, tab, keyword, customerMap]);

  return (
    <div className="space-y-4">
      {/* 4 thẻ metric — theo preview/code.html */}
      <CashierStats
        stats={{
          waitingTotal: active.length,
          confirmedCount: counts.confirm,
          pendingCount: counts.pending,
          revenueToday: completedToday.reduce((s, o) => s + o.total_amount, 0),
          completedCountToday: completedToday.length,
        }}
      />

      {/* Tiêu đề + toolbar dùng chung — trạng thái lọc qua dropdown của DashToolbar */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-on-surface">Đơn cần xử lý</h2>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">
          {active.length} đơn
        </span>
      </div>
      <DashToolbar
        searchPlaceholder="Tìm mã đơn, tên khách, SĐT..."
        searchValue={keyword}
        onSearchChange={setKeyword}
        filters={[
          {
            id: 'status',
            placeholder: 'Tất cả trạng thái',
            value: tab === 'all' ? '' : tab,
            widthClass: 'sm:w-52',
            options: [
              { value: '', label: `Tất cả (${counts.all})` },
              { value: 'pending', label: `Chờ xử lý (${counts.pending})` },
              { value: 'confirm', label: `Đã xác nhận (${counts.confirm})` },
              { value: 'delivery', label: `Đang giao (${counts.delivery})` },
            ],
            onValueChange: (v) => setTab((v || 'all') as TabKey),
          },
        ]}
        onRefresh={() => refetch()}
        onReset={() => {
          setTab('all');
          setKeyword('');
        }}
      />

      {/* Lưới cards — theo preview/code.html (3 cột) */}
      {isError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Không tải được đơn cần xử lý: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc kiểm
          tra kết nối API.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-outline bg-surface p-4">
              <div className="h-4 w-24 rounded bg-surface-container" />
              <div className="mt-3 h-9 w-9 rounded-full bg-surface-container" />
              <div className="mt-3 h-12 rounded-lg bg-surface-container" />
              <div className="mt-4 h-6 rounded bg-surface-container" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline bg-surface p-8 text-center">
          <Clock3 className="h-6 w-6 text-on-surface-variant" />
          <p className="text-sm font-medium text-on-surface">Không có đơn cần xử lý</p>
          <p className="text-xs text-on-surface-variant">
            {keyword || tab !== 'all'
              ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'
              : 'Tất cả đơn đã hoàn tất — tạo đơn mới cho khách tại quầy.'}
          </p>
          <Button size="sm" onClick={() => router.push('/app/cashier/pos')} className="mt-1">
            <Plus className="h-3.5 w-3.5" />
            Tạo đơn mới
          </Button>
        </div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((order) => (
            <CashierOrderCard
              key={order.id}
              order={order}
              customer={order.customer_id ? customerMap.get(order.customer_id) : undefined}
            />
          ))}
        </section>
      )}

      {/* Nút xem tất cả */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex flex-col items-center justify-center pt-2">
          <button
            onClick={() => router.push('/app/orders')}
            className="inline-flex items-center gap-2 rounded-xl border border-outline bg-surface px-5 py-2.5 text-xs font-semibold tracking-wide text-on-surface shadow-sm transition-colors hover:bg-surface-container"
          >
            <span>Xem tất cả {active.length} đơn hôm nay</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {latestCompleted && (
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-outline bg-surface p-4 shadow-sm md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-success">
              <BadgeCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-on-surface">Hóa đơn hoàn tất gần đây</h4>
              <p className="text-xs text-on-surface-variant">
                Đơn {latestCompleted.code} (
                {latestCompleted.customer_id
                  ? (customerMap.get(latestCompleted.customer_id)?.name ?? 'Khách lẻ')
                  : 'Khách lẻ'}{' '}
                - {formatVND(latestCompleted.total_amount)}) chốt thành công
              </p>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2 md:w-auto">
            <button
              onClick={() => router.push(`/app/orders/${latestCompleted.id}`)}
              className="rounded-lg border border-outline px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              In lại phiếu
            </button>
            <button
              onClick={() => router.push('/app/orders')}
              className="rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-container"
            >
              Xem lịch sử giao dịch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
