import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCashFlows } from '@/services/cashflow';

type UseCashFlowsParams = {
  search?: string;
  kind?: string;
  categoryId?: string;
  fundId?: string;
  status?: string;
  sortBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export default function useCashFlows({
  search,
  kind,
  categoryId,
  fundId,
  status,
  sortBy,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: UseCashFlowsParams) {
  return useQuery({
    queryKey: [
      'cashflows',
      { search, kind, categoryId, fundId, status, sortBy, dateFrom, dateTo, page, pageSize },
    ],
    queryFn: async () =>
      getCashFlows({
        search,
        kind,
        categoryId,
        fundId,
        status,
        sortBy,
        dateFrom,
        dateTo,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
