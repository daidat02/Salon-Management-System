'use client';

import useReportData from '../hooks/use-report-data';
import ProfitBreakdown from './ProfitBreakdown';
import ReportKpiCards from './ReportKpiCards';
import RevenueComposition from './RevenueComposition';
import RevenueProfitChart from './RevenueProfitChart';
import TopServicesTable from './TopServicesTable';

export default function ReportView() {
  const data = useReportData();

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
