import { useQuery } from '@tanstack/react-query';
import { getFundMovementHistory } from '@/services/cashflow';

export default function useFundMovementHistory() {
  return useQuery({
    queryKey: ['fund-movement-history'],
    queryFn: getFundMovementHistory,
    staleTime: 60 * 1000,
  });
}
