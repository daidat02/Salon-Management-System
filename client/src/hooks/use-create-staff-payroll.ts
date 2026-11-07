import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffPayroll } from '@/services/staff';

type CreateStaffPayrollVars = {
  id: string;
  targetMonth: string;
};

export function useCreateStaffPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetMonth }: CreateStaffPayrollVars) =>
      createStaffPayroll(id, targetMonth),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['staff-payroll', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-salary-adjustments'] });
    },
  });
}
