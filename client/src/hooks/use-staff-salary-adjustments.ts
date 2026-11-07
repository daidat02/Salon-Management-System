import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getStaffSalaryAdjustments } from '@/services/staff';

export default function useStaffSalaryAdjustments(
  id: string | null | undefined,
  periodMonth: string,
) {
  return useQuery({
    queryKey: ['staff-salary-adjustments', id, periodMonth],
    queryFn: () => getStaffSalaryAdjustments(id as string, periodMonth),
    enabled: !!id && !!periodMonth,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
