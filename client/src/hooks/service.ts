import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getServicesByOrgID,
  getServiceDetail,
  getServiceStats,
  createService,
  updateService,
  replaceServiceMaterials,
  type CreateServicePayload,
  type UpdateServicePayload,
  type ReplaceServiceMaterialPayload,
} from '@/services/service';
import { queryKeys } from './query-keys';

type UseServiceParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  categoryId?: string;
  sort?: string;
};

export function useService({
  page,
  pageSize,
  search,
  status,
  categoryId,
  sort,
}: UseServiceParams) {
  return useQuery({
    queryKey: queryKeys.service.list({ page, pageSize, search, status, categoryId, sort }),
    queryFn: async () => getServicesByOrgID({ page, pageSize, search, status, categoryId, sort }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceDetail(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.service.detail(id),
    queryFn: () => getServiceDetail(id as string),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceStats() {
  return useQuery({
    queryKey: queryKeys.service.stats(),
    queryFn: () => getServiceStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateServicePayload) => createService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.service.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.service.stats() });
    },
  });
}

export function useUpdateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateServicePayload }) =>
      updateService(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.service.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.service.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.service.detail(variables.id) });
    },
  });
}

export function useReplaceServiceMaterials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      materials,
    }: {
      id: string;
      materials: ReplaceServiceMaterialPayload[];
    }) => replaceServiceMaterials(id, materials),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.service.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.service.lists() });
    },
  });
}

export type { CreateServicePayload, UpdateServicePayload, ReplaceServiceMaterialPayload };
