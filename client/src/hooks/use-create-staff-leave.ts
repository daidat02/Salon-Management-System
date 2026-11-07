import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createStaffLeave, type CreateStaffLeavePayload } from '@/services/staff';

export function useCreateStaffLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateStaffLeavePayload }) =>
      createStaffLeave(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['staff-leaves', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['staff-payroll', variables.id] });
    },
  });
}
