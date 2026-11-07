import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStaffSalaryAdjustment } from '@/services/staff';

export function useDeleteStaffSalaryAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaffSalaryAdjustment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-salary-adjustments'] });
    },
  });
}
