'use client';

import { Filter, ScanBarcode, Search, Store } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from 'cn';
import { DashSelect } from '@/components/dashboard/DashSelect';
import type { CatalogTypeFilter } from './useCatalogData';
import type { Category } from '@/types/category';

type CatalogToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  activeCat: string;
  onCategoryChange: (id: string) => void;
  activeType: CatalogTypeFilter;
  onTypeChange: (type: CatalogTypeFilter) => void;
};

export default function CatalogToolbar({
  search,
  onSearchChange,
  categories,
  activeCat,
  onCategoryChange,
  activeType,
  onTypeChange,
}: CatalogToolbarProps) {
  return (
    <div className="bg-surface flex flex-col gap-3 rounded-md border border-outline p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="text-primary h-6 w-6" />
          <h2 className="text-lg font-bold text-on-surface">Thu ngân & Bán hàng</h2>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-on-surface-variant pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm tên dịch vụ, liệu trình, sản phẩm... (F2 hoặc Cmd+K)"
            className="bg-surface-container-low border-outline h-8 rounded-md border py-2 pr-14 pl-9 text-sm text-on-surface placeholder:text-xs focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <DashSelect
            value={activeType || 'all'}
            onValueChange={(value) =>
              onTypeChange(value === 'all' ? '' : (value as CatalogTypeFilter))
            }
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'service', label: 'Dịch vụ' },
              { value: 'product', label: 'Sản phẩm' },
            ]}
            triggerClassName="h-8! w-[118px] rounded-md text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5 no-scrollbar">
        <button
          onClick={() => onCategoryChange('')}
          className={cn(
            'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
            activeCat === ''
              ? 'bg-primary text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container-low hover:bg-slate-200 text-on-surface border border-outline',
          )}
        >
          Tất cả
        </button>
        {categories.map((cat) => {
          const isActive = cat.id === activeCat;
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(isActive ? '' : cat.id)}
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all',
                isActive
                  ? 'bg-primary text-on-primary font-semibold shadow-sm'
                  : 'bg-surface-container-low hover:bg-slate-200 text-on-surface border border-outline',
              )}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
