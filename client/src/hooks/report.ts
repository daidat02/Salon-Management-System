import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRevenueReport } from '@/services/report';
import { getOverview } from '@/services/overview';
import { queryKeys } from './query-keys';

type UseRevenueReportParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function useRevenueReport({ dateFrom, dateTo }: UseRevenueReportParams) {
  return useQuery({
    queryKey: queryKeys.report.revenue({ dateFrom, dateTo }),
    queryFn: () => getRevenueReport({ dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOverview() {
  return useQuery({
    queryKey: queryKeys.report.overview(),
    queryFn: () => getOverview(),
    staleTime: 60 * 1000,
  });
}
