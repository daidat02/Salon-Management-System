'use client';

/* eslint-disable react-hooks/set-state-in-effect -- đồng bộ state với localStorage là mục đích của hook */

import * as React from 'react';

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // Bỏ qua dữ liệu mock hỏng, giữ giá trị mặc định.
    } finally {
      setHydrated(true);
    }
  }, [key]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage có thể bị chặn; bỏ qua ở chế độ xem trước.
    }
  }, [key, value, hydrated]);

  return [value, setValue, hydrated] as const;
}
