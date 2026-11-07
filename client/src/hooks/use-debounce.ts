import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UseDebounceSearchOptions {
  paramName?: string; // Tên query param trên URL (mặc định: 'search')
  delay?: number; // Thời gian debounce ms (mặc định: 400ms)
  resetPage?: boolean; // Có xoá param 'page' khi search không (mặc định: true)
  pageParamName?: string; // Tên query param trang (mặc định: 'page')
}

export function useDebounceSearch(inputValue: string, options: UseDebounceSearchOptions = {}) {
  const { paramName = 'search', delay = 400, resetPage = true, pageParamName = 'page' } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get(paramName) ?? '';

  useEffect(() => {
    // Không đẩy router nếu giá trị input trùng với URL hiện tại
    if (inputValue === currentSearch) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = inputValue.trim();

      if (trimmed) {
        params.set(paramName, trimmed);
      } else {
        params.delete(paramName);
      }
      if (resetPage) {
        params.delete(pageParamName);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    }, delay);

    return () => clearTimeout(timer);
  }, [inputValue, currentSearch, delay, paramName, pageParamName, resetPage, router, searchParams]);
}
