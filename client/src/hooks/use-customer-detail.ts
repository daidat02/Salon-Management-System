import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCustomerDetail } from '@/services/customer';

type UseCustomerDetailParams = {
  id: string | null | undefined;
  histPage?: number;
  histPageSize?: number;
  ordPage?: number;
  ordPageSize?: number;
};

export default function useCustomerDetail({
  id,
  histPage = 1,
  histPageSize = 5,
  ordPage = 1,
  ordPageSize = 5,
}: UseCustomerDetailParams) {
  return useQuery({
    queryKey: ['customer-detail', id, { histPage, histPageSize, ordPage, ordPageSize }],
    queryFn: () => getCustomerDetail(id as string, { histPage, histPageSize, ordPage, ordPageSize }),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
