import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelAppointment } from '@/services/appointment';

type CancelAppointmentVariables = {
  id: string;
  reason?: string;
};

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: CancelAppointmentVariables) => cancelAppointment(id, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail', variables.id] });
    },
  });
}
