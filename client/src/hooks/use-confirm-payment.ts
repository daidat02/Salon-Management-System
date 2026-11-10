import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmPayment, type ConfirmPaymentPayload } from '@/services/order';

export function useConfirmPayment(orderId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: ConfirmPaymentPayload;
    }) => confirmPayment(orderId as string, paymentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export type { ConfirmPaymentPayload };
