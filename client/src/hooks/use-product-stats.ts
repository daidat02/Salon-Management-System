import { useQuery } from '@tanstack/react-query';
import { getProductStats } from '@/services/product';

export default function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: () => getProductStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
