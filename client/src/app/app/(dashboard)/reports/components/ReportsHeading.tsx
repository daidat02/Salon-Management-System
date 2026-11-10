'use client';

import * as React from 'react';
import type { DateRange } from 'react-day-picker';
import { Download, FileText } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeading from '@/components/dashboard/PageHeading';
import { DashDateRangePicker } from '@/components/dashboard/DashDateRangePicker';
import useReportData from '../hooks/use-report-data';
import { downloadReportCsv } from '../lib/report-data';

export default function ReportsHeading() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, range, isLoading, isError } = useReportData();

  const dateRange = React.useMemo<DateRange>(
    () => ({ from: range.from, to: range.to }),
    [range.from, range.to],
  );

  const handleDateRangeChange = (nextRange: DateRange | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');

    if (nextRange?.from) {
      const from = new Date(nextRange.from);
      from.setHours(0, 0, 0, 0);
      params.set('date_from', from.toISOString());
    } else {
      params.delete('date_from');
    }

    if (nextRange?.to) {
      const to = new Date(nextRange.to);
      to.setHours(23, 59, 59, 999);
      params.set('date_to', to.toISOString());
    } else {
      params.delete('date_to');
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <PageHeading
      breadcrumbs={[
        { label: 'Trang chủ', href: '#' },
        { label: 'Báo cáo & Thống kê', active: true },
      ]}
      title="Báo cáo & Phân tích Doanh thu"
      badge="Báo cáo tài chính"
      badgeVariant="soft"
      subtitle="Theo dõi doanh thu, lợi nhuận và cơ cấu tài chính của salon theo khoảng ngày đã chọn"
      dateRangeContent={
        <DashDateRangePicker
          value={dateRange}
          onValueChange={handleDateRangeChange}
          triggerClassName="h-auto rounded-lg text-xs"
        />
      }
      actions={[
        {
          label: 'Xuất CSV',
          icon: Download,
          variant: 'outline',
          disabled: !data || isLoading || isError,
          onClick: () => {
            if (data) downloadReportCsv(data);
          },
        },
        {
          label: 'Tải báo cáo',
          icon: FileText,
          variant: 'primary',
          disabled: true,
          title: 'Tính năng tải báo cáo PDF sẽ sớm được hỗ trợ',
        },
      ]}
    />
  );
}
