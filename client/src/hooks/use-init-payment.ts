import { useMutation } from '@tanstack/react-query';
import { initPayment } from '@/services/order';

export function useInitPayment(orderId: string | undefined) {
  return useMutation({
    mutationFn: () => initPayment(orderId as string),
  });
}
