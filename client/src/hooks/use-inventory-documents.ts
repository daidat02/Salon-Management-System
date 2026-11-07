import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getInventoryDocuments } from '@/services/inventory';

type UseInventoryDocumentsParams = {
  search?: string;
  sort?: string;
  filter?: string;
  paymentStatus?: string;
  page: number;
  pageSize: number;
};

export default function useInventoryDocuments({
  search,
  sort,
  filter,
  paymentStatus,
  page,
  pageSize,
}: UseInventoryDocumentsParams) {
  return useQuery({
    queryKey: ['inventory-documents', { search, sort, filter, paymentStatus, page, pageSize }],
    queryFn: async () =>
      getInventoryDocuments({ search, sort, filter, paymentStatus, page, pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
