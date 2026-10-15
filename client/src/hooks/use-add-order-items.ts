import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addOrderItems, type CreateOrderItemPayload } from '@/services/order';

export function useAddOrderItems(orderId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: CreateOrderItemPayload[]) => addOrderItems(orderId as string, { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
    },
  });
}

export type { CreateOrderItemPayload };
