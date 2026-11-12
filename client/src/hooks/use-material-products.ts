import { useQuery } from '@tanstack/react-query';
import { getMaterialProducts } from '@/services/product';

export function useMaterialProducts(enabled = true) {
  return useQuery({
    queryKey: ['material-products'],
    queryFn: getMaterialProducts,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export default useMaterialProducts;
