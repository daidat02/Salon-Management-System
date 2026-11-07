import { useQuery } from '@tanstack/react-query';
import { getServiceDetail } from '@/services/service';

export default function useServiceDetail(id: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ['service-detail', id],
    queryFn: () => getServiceDetail(id as string),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}
