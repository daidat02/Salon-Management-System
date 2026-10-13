import { useQuery } from '@tanstack/react-query';
import { getCustomerStats } from '@/services/customer';

export default function useCustomerStats() {
  return useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => getCustomerStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
