import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getStaffServiceHistory } from '@/services/staff';

type UseStaffServiceHistoryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default function useStaffServiceHistory(
  id: string | null | undefined,
  { page = 1, pageSize = 10, search = '', dateFrom, dateTo }: UseStaffServiceHistoryParams = {},
) {
  return useQuery({
    queryKey: ['staff-service-history', id, { page, pageSize, search, dateFrom, dateTo }],
    queryFn: () =>
      getStaffServiceHistory(id as string, { page, pageSize, search, dateFrom, dateTo }),
    enabled: !!id,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
