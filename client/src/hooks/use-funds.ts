import { useQuery } from '@tanstack/react-query';
import { getFunds } from '@/services/cashflow';

export default function useFunds(activeOnly = true) {
  return useQuery({
    queryKey: ['funds', { activeOnly }],
    queryFn: async () => getFunds(activeOnly),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
