import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAppointment, type CreateAppointmentPayload } from '@/services/appointment';

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) => createAppointment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
}
