import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getInventoryDocument,
  getInventoryDocuments,
  getInventoryStats,
  getInventoryTransactions,
  createInventoryDocument,
  addInventoryPayment,
  type CreateDocumentPayload,
  type AddInventoryPaymentPayload,
} from '@/services/inventory';
import { queryKeys } from './query-keys';

type UseInventoryDocumentsParams = {
  search?: string;
  sort?: string;
  filter?: string;
  paymentStatus?: string;
  page: number;
  pageSize: number;
};

type UseInventoryTransactionsParams = {
  productId?: string;
  page: number;
  pageSize: number;
};

export function useInventoryDocument(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id),
    queryFn: async () => getInventoryDocument(id as string),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInventoryDocuments({
  search,
  sort,
  filter,
  paymentStatus,
  page,
  pageSize,
}: UseInventoryDocumentsParams) {
  return useQuery({
    queryKey: queryKeys.inventory.list({ search, sort, filter, paymentStatus, page, pageSize }),
    queryFn: async () =>
      getInventoryDocuments({ search, sort, filter, paymentStatus, page, pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: queryKeys.inventory.stats(),
    queryFn: () => getInventoryStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInventoryTransactions({
  productId,
  page,
  pageSize,
}: UseInventoryTransactionsParams) {
  return useQuery({
    queryKey: queryKeys.inventory.transactions({ productId, page, pageSize }),
    queryFn: async () => getInventoryTransactions({ productId, page, pageSize }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDocumentPayload) => createInventoryDocument(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.product.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.product.stats() });
    },
  });
}

export function useAddInventoryPayment(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddInventoryPaymentPayload) =>
      addInventoryPayment(documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.cashflow.all });
    },
  });
}

export type { CreateDocumentPayload, AddInventoryPaymentPayload };
