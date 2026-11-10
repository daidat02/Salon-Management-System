import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRevenueReport } from '@/services/report';

type UseRevenueReportParams = {
  dateFrom?: string | null;
  dateTo?: string | null;
};

export default function useRevenueReport({
  dateFrom,
  dateTo,
}: UseRevenueReportParams) {
  return useQuery({
    queryKey: ['revenue-report', { dateFrom, dateTo }],
    queryFn: () => getRevenueReport({ dateFrom, dateTo }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}
