'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { createReportData, resolveReportRange } from '../lib/report-data';

export default function useReportData() {
  const searchParams = useSearchParams();
  const dateFrom = searchParams.get('date_from');
  const dateTo = searchParams.get('date_to');

  return React.useMemo(
    () => createReportData(resolveReportRange(dateFrom, dateTo)),
    [dateFrom, dateTo],
  );
}
