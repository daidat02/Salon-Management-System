import { useQuery } from '@tanstack/react-query';
import { getCashFlowStats } from '@/services/cashflow';

type UseCashFlowStatsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export default function useCashFlowStats({ dateFrom, dateTo }: UseCashFlowStatsParams = {}) {
  return useQuery({
    queryKey: ['cashflow-stats', { dateFrom, dateTo }],
    queryFn: () => getCashFlowStats({ dateFrom, dateTo }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
