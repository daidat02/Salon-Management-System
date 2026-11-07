import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createOrder, type CreateOrderPayload } from '@/services/order';

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      // Tạo đơn từ lịch hẹn làm lịch đổi sang in_progress.
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointment-detail'] });
    },
  });
}

export type { CreateOrderPayload };
