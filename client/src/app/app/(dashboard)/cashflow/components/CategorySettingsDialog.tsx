'use client';

import { DashDialog } from '@/components/dashboard/DashDialog';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import useCategoryExpenseStats, {
  type CategoryExpenseStat,
} from '@/hooks/use-category-expense-stats';
import { cn } from 'cn';

type CategorySettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFrom?: string;
  dateTo?: string;
};

const CATEGORY_TYPE_LABELS: Record<CategoryExpenseStat['category_type'], string> = {
  revenue: 'Doanh thu',
  operating_expense: 'Chi phí vận hành',
  non_pnl: 'Ngoài P&L',
};

function CategoryCard({ category }: { category: CategoryExpenseStat }) {
  return (
    <div
      className={cn(
        'border-outline bg-surface hover:border-primary/40 rounded-lg border p-3 transition-colors',
        !category.is_active && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-on-surface truncate text-xs font-bold">{category.name}</p>
          <p className="text-on-surface-variant mt-0.5 text-[11px]">{category.code}</p>
        </div>
        <Tag variant={category.is_active ? 'success' : 'gray'} size="sm" shape="pill" dot>
          {category.is_active ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Tag variant="blue" size="sm">
          {CATEGORY_TYPE_LABELS[category.category_type]}
        </Tag>
        <Tag variant="slate" size="sm">
          {category.is_system ? 'Hệ thống' : 'Tự tạo'}
        </Tag>
        <Tag variant="default" size="sm">
          Thứ tự {category.sort_order}
        </Tag>
      </div>
    </div>
  );
}

function CategorySection({
  title,
  description,
  categories,
}: {
  title: string;
  description: string;
  categories: CategoryExpenseStat[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <div>
        <h3 className="text-on-surface text-sm font-bold">{title}</h3>
        <p className="text-on-surface-variant text-[11px]">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

export function CategorySettingsDialog({
  open,
  onOpenChange,
  dateFrom,
  dateTo,
}: CategorySettingsDialogProps) {
  const { data: categories = [], isLoading } = useCategoryExpenseStats({ dateFrom, dateTo });

  const operatingCategories = categories.filter(
    (category) => category.category_type === 'operating_expense',
  );
  const nonPnlCategories = categories.filter(
    (category) => category.category_type === 'non_pnl',
  );

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cài đặt danh mục chi phí"
      description="Danh sách danh mục và tổng chi thực tế theo dữ liệu trong kỳ"
      maxWidth="max-w-[calc(100vw-2rem)] sm:max-w-[1100px]"
      footer={
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="border-outline text-slate-600 hover:bg-surface-container px-4 py-2 text-xs font-semibold"
        >
          Đóng
        </Button>
      }
    >
      <div className="space-y-5 py-4">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="border-outline bg-surface h-[148px] animate-pulse rounded-lg border"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="border-outline bg-surface text-on-surface-variant rounded-lg border px-3 py-8 text-center text-xs">
            Chưa có danh mục chi phí nào
          </p>
        ) : (
          <>
            <CategorySection
              title="Chi phí vận hành"
              description="Các khoản chi được tính vào kết quả hoạt động của salon"
              categories={operatingCategories}
            />
            <CategorySection
              title="Ngoài P&L"
              description="Các khoản chi không tính vào lãi/lỗ vận hành"
              categories={nonPnlCategories}
            />
          </>
        )}
      </div>
    </DashDialog>
  );
}

export default CategorySettingsDialog;
