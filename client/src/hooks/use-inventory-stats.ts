import { useQuery } from '@tanstack/react-query';
import { getInventoryStats } from '@/services/inventory';

export default function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: () => getInventoryStats(),
    staleTime: 5 * 60 * 1000,
  });
}
