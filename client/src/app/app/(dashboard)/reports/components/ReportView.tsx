'use client';

import { RefreshCw } from 'lucide-react';
import useReportData from '../hooks/use-report-data';
import ProfitBreakdown from './ProfitBreakdown';
import ReportKpiCards from './ReportKpiCards';
import RevenueComposition from './RevenueComposition';
import RevenueProfitChart from './RevenueProfitChart';
import TopServicesTable from './TopServicesTable';

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-xl border border-outline bg-surface-container-low"
          />
        ))}
      </section>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-80 animate-pulse rounded-xl border border-outline bg-surface-container-low lg:col-span-8" />
        <div className="h-80 animate-pulse rounded-xl border border-outline bg-surface-container-low lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="h-80 animate-pulse rounded-xl border border-outline bg-surface-container-low lg:col-span-5" />
        <div className="h-80 animate-pulse rounded-xl border border-outline bg-surface-container-low lg:col-span-7" />
      </div>
    </div>
  );
}

export default function ReportView() {
  const { data, isLoading, isError, refetch } = useReportData();

  if (isLoading) return <ReportSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-outline bg-surface px-6 py-16 text-center shadow-sm">
        <p className="text-sm font-semibold text-on-surface">
          Không tải được báo cáo doanh thu
        </p>
        <p className="text-xs text-on-surface-variant">
          Vui lòng kiểm tra kết nối và thử lại.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ReportKpiCards kpi={data.kpi} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <RevenueProfitChart
          points={data.annualMonthly}
          year={data.annualYear}
        />
        <RevenueComposition
          items={data.composition}
          totalRevenue={data.kpi.revenue}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ProfitBreakdown items={data.profitBreakdown} />
        <TopServicesTable services={data.topServices} range={data.range} />
      </div>
    </div>
  );
}
