'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import useRevenueReport from '@/hooks/use-revenue-report';
import { resolveReportRange } from '../lib/report-data';

export default function useReportData() {
  const searchParams = useSearchParams();
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');
  const fallbackRange = React.useMemo(
    () => resolveReportRange(dateFrom, dateTo),
    [dateFrom, dateTo],
  );
  const query = useRevenueReport({ dateFrom, dateTo });

  return {
    ...query,
    range: query.data?.range ?? fallbackRange,
  };
}
