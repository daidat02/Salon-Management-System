import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  rescheduleAppointment,
  type RescheduleAppointmentPayload,
} from '@/services/appointment';

type RescheduleAppointmentVariables = {
  id: string;
  payload: RescheduleAppointmentPayload;
};

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: RescheduleAppointmentVariables) =>
      rescheduleAppointment(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', variables.id] });
    },
  });
}
