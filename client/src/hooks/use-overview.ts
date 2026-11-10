import { useQuery } from '@tanstack/react-query';
import { getOverview } from '@/services/overview';

export default function useOverview() {
  return useQuery({
    queryKey: ['overview'],
    queryFn: () => getOverview(),
    staleTime: 60 * 1000,
  });
}
