import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createStaffSalaryAdjustment,
  type CreateStaffSalaryAdjustmentPayload,
} from '@/services/staff';

export function useCreateStaffSalaryAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffSalaryAdjustmentPayload) =>
      createStaffSalaryAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-salary-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['staff-payroll'] });
    },
  });
}
