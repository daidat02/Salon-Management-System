import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateService, type UpdateServicePayload } from '@/services/service';

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      updateService(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-stats'] });
      queryClient.invalidateQueries({ queryKey: ['service-detail', variables.id] });
    },
  });
}

export type { UpdateServicePayload };
