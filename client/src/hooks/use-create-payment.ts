import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPayment, type CreatePaymentPayload } from '@/services/order';

export function useCreatePayment(orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentPayload) => createPayment(orderId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export type { CreatePaymentPayload };
