import { useQuery } from '@tanstack/react-query';
import { getServiceStats } from '@/services/service';

export default function useServiceStats() {
  return useQuery({
    queryKey: ['service-stats'],
    queryFn: () => getServiceStats(),
    staleTime: 5 * 60 * 1000,
  });
}
