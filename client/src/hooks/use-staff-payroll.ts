import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getStaffPayroll } from '@/services/staff';

export default function useStaffPayroll(
  id: string | null | undefined,
  dateFrom?: string,
  dateTo?: string,
  standardWorkingDays = 26,
) {
  return useQuery({
    queryKey: ['staff-payroll', id, dateFrom, dateTo, standardWorkingDays],
    queryFn: () =>
      getStaffPayroll(id as string, { dateFrom, dateTo, standardWorkingDays }),
    enabled: !!id && !!dateFrom && !!dateTo,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
