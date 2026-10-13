'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashTabs from '@/components/dashboard/DashTabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useCategory from '@/hooks/use-category';
import { Search, ShoppingBag, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

const CategoryToolbar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const tab = searchParams.get('tab') || 'service';
  const [inputValue, setInputValue] = React.useState(search);
  const [lastSearch, setLastSearch] = React.useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    setInputValue(search);
  }

  const { data } = useCategory({ page: 1, pageSize: 100 });
  const categories = data?.data ?? [];
  const serviceCount = categories.filter((c) => c.type === 'service').length;
  const productCount = categories.filter((c) => c.type === 'product').length;

  useEffect(() => {
    if (inputValue === search) return;
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (inputValue.trim()) params.set('search', inputValue.trim());
      else params.delete('search');
      params.delete('page');
      router.push(`?${params.toString()}`, { scroll: false });
    }, 400);
    return () => clearTimeout(t);
  }, [inputValue, search, router, searchParams]);

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete('status');
    else params.set('status', value);
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (value: 'service' | 'product') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleReset = () => {
    router.push('/app/categories?tab=service', { scroll: false });
  };

  return (
    <section className="bg-surface flex flex-col gap-3 rounded-md border border-outline p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <DashTabs
        value={tab}
        onValueChange={(v) => handleTabChange(v as 'service' | 'product')}
        items={[
          { value: 'service', label: `Danh mục Dịch vụ (${serviceCount})`, icon: Sparkles },
          { value: 'product', label: `Danh mục Sản phẩm (${productCount})`, icon: ShoppingBag },
        ]}
      />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <span className="text-on-surface-variant pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <Search className="h-3.5 w-3.5" />
          </span>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tìm theo tên danh mục..."
            className="bg-surface-container border-outline placeholder:text-on-surface-variant focus-visible:border-primary focus-visible:ring-primary/30 h-8 w-full rounded-md border py-2 pr-3 pl-8 text-xs placeholder:text-xs focus-visible:ring-1"
          />
        </div>

        <div className="relative w-full sm:w-44">
          <Select
            value={status || undefined}
            onValueChange={(v) => handleStatusChange(v === '__all' ? '' : (v ?? ''))}
          >
            <SelectTrigger
              size="default"
              className="bg-surface-container border-outline text-on-surface focus-visible:border-primary focus-visible:ring-primary/30 h-8 w-full rounded-md border px-3 py-2 text-xs focus-visible:ring-1 data-placeholder:text-on-surface-variant"
            >
              <SelectValue placeholder="Tất cả trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all" className="text-xs">
                Tất cả trạng thái
              </SelectItem>
              <SelectItem value="active" className="text-xs">
                Hoạt động
              </SelectItem>
              <SelectItem value="inactive" className="text-xs">
                Tạm ẩn
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="border-outline text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-md border px-3 py-1.5 text-xs font-medium shrink-0"
        >
          Đặt lại bộ lọc
        </Button>
      </div>
    </section>
  );
};

export default CategoryToolbar;
