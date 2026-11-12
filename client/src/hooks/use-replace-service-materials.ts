import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  replaceServiceMaterials,
  type ReplaceServiceMaterialPayload,
} from '@/services/service';

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
      queryClient.invalidateQueries({ queryKey: ['service-detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

export type { ReplaceServiceMaterialPayload };
