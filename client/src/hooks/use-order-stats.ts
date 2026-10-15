import { useQuery } from '@tanstack/react-query';
import { getOrderStats } from '@/services/order';

export default function useOrderStats(enabled = true) {
  return useQuery({
    queryKey: ['order-stats'],
    queryFn: getOrderStats,
    enabled,
    staleTime: 60 * 1000, // 1 phút
  });
}
