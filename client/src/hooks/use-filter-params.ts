import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

type FilterOptions = {
  placeholder?: string;
  resetPage?: boolean;
  pageParamName?: string;
};

export function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setFilterParam = useCallback(
    (filterId: string, value: string, options: FilterOptions = {}) => {
      const { placeholder = '', resetPage = true, pageParamName = 'page' } = options;

      const params = new URLSearchParams(searchParams.toString());

      if (!value || value === placeholder || value.startsWith('Tất cả')) {
        params.delete(filterId);
      }
      if (resetPage) {
        params.delete(pageParamName);
      }
      if (value && value !== placeholder && !value.startsWith('Tất cả')) {
        params.set(filterId, value);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );
  return { setFilterParam, searchParams };
}
