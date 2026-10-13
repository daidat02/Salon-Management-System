import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, type CreateOrderPayload } from '@/services/order';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export type { CreateOrderPayload };
