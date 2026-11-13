'use client';

import { RefreshCw } from 'lucide-react';
import { StatsSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/services/apiClient';
import { useOverview } from '@/hooks/report';
import OverviewHeading from './OverviewHeading';
import OverviewKpiCards from './OverviewKpiCards';
import RevenueChart from './RevenueChart';
import LowStockAlerts from './LowStockAlerts';
import TodayAppointments from './TodayAppointments';
import RecentOrders from './RecentOrders';

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <StatsSkeleton count={4} />
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[360px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[360px] rounded-xl" />
      </section>
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
      </section>
    </div>
  );
}

export default function OverviewView() {
  const { data, isLoading, isError, isFetching, error, refetch } = useOverview();

  return (
    <div className="space-y-5">
      <OverviewHeading kpi={data?.kpi} />

      {isLoading && !data ? (
        <OverviewSkeleton />
      ) : isError && !data ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Không tải được số liệu tổng quan: {getApiErrorMessage(error)}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-surface px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      ) : data ? (
        <>
          <OverviewKpiCards kpi={data.kpi} />

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <RevenueChart points={data.revenue7d} />
            <LowStockAlerts items={data.lowStock} />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <TodayAppointments
              appointments={data.todayAppointments}
              total={data.kpi.appointmentsToday}
            />
            <RecentOrders orders={data.recentOrders} total={data.kpi.ordersToday} />
          </section>

          {isFetching && (
            <p className="text-right text-[11px] text-on-surface-variant">Đang cập nhật…</p>
          )}
        </>
      ) : null}
    </div>
  );
}
