import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCashFlowCategories } from '@/services/cashflow';

export default function useCashFlowCategories(kind?: string) {
  return useQuery({
    queryKey: ['cashflow-categories', { kind }],
    queryFn: async () => getCashFlowCategories(kind),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
