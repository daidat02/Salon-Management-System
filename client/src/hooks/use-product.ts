import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getProductsByOrgID } from '@/services/product';
type UseProductParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  categoryId?: string;
  sort?: string;
};

export default function useProduct({
  page,
  pageSize,
  search,
  status,
  categoryId,
  sort,
}: UseProductParams) {
  return useQuery({
    queryKey: ['products', { page, pageSize, search, status, categoryId, sort }],
    queryFn: async () => getProductsByOrgID({ page, pageSize, search, status, categoryId, sort }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
