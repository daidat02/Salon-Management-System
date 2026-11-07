import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateStaff, type UpdateStaffPayload } from '@/services/staff';

export default function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStaffPayload) => updateStaff(id, payload),
    onSuccess: (staff) => {
      queryClient.setQueryData(['staff-detail', id], staff);
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}
