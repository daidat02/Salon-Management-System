import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateAppointment, type CreateAppointmentPayload } from '@/services/appointment';

type UpdateAppointmentVariables = {
  id: string;
  payload: CreateAppointmentPayload;
};

export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: UpdateAppointmentVariables) => updateAppointment(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', variables.id] });
    },
  });
}
