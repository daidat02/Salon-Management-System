import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addInventoryPayment,
  type AddInventoryPaymentPayload,
} from '@/services/inventory';

export default function useAddInventoryPayment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddInventoryPaymentPayload) =>
      addInventoryPayment(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-document', documentId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-documents'] });
      queryClient.invalidateQueries({ queryKey: ['cashflows'] });
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-stats'] });
    },
  });
}
