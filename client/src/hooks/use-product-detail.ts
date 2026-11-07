import { useQuery } from '@tanstack/react-query';
import { getProductById } from '@/services/product';

export default function useProductDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: ['product-detail', id],
    queryFn: () => getProductById(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
