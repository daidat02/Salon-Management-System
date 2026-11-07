import { useQuery } from '@tanstack/react-query';
import { getSuppliers } from '@/services/supplier';

export default function useSuppliers(search = '') {
  return useQuery({
    queryKey: ['suppliers', { search }],
    queryFn: () => getSuppliers({ search, page: 1, pageSize: 100 }),
    staleTime: 5 * 60 * 1000,
  });
}
