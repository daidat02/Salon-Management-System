'use client';

import * as React from 'react';
import { Wallet } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { useCashFlowCategories } from '@/hooks/cashflow';
import type { CashFlowCategory } from '@/types/cashflow';
import { cn } from 'cn';
import { DEFAULT_FINANCE_FLAGS, type MockFinanceFlags } from './mock-data';
import { useLocalStorageState } from './use-local-storage-state';

const CATEGORY_TYPE_LABELS: Record<CashFlowCategory['category_type'], string> = {
  revenue: 'Doanh thu',
  operating_expense: 'Chi phí vận hành',
  non_pnl: 'Ngoài P&L',
};

const CATEGORY_GROUPS: {
  type: CashFlowCategory['category_type'];
  title: string;
  description: string;
}[] = [
  {
    type: 'revenue',
    title: CATEGORY_TYPE_LABELS.revenue,
    description: 'Các khoản thu được tính vào doanh thu của salon.',
  },
  {
    type: 'operating_expense',
    title: CATEGORY_TYPE_LABELS.operating_expense,
    description: 'Các khoản chi được tính vào kết quả hoạt động.',
  },
  {
    type: 'non_pnl',
    title: CATEGORY_TYPE_LABELS.non_pnl,
    description: 'Nạp/rút quỹ, nhập hàng và các dòng tiền ngoài lãi lỗ.',
  },
];

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border-outline rounded-xl border p-5 shadow-sm">
      <div className="border-outline flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-on-surface text-sm font-bold">{title}</h3>
          <p className="text-on-surface-variant mt-1 text-[11px] leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function CategoryCard({ category }: { category: CashFlowCategory }) {
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
        <Tag
          variant={category.is_active ? 'success' : 'gray'}
          size="sm"
          shape="pill"
          dot
        >
          {category.is_active ? 'Hoạt động' : 'Tạm dừng'}
        </Tag>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Tag variant={category.kind === 'income' ? 'emerald' : 'error'} size="sm">
          {category.kind === 'income' ? 'Thu' : 'Chi'}
        </Tag>
        <Tag variant="blue" size="sm">
          {CATEGORY_TYPE_LABELS[category.category_type]}
        </Tag>
        <Tag variant="slate" size="sm">
          {category.is_system ? 'Hệ thống' : 'Tự tạo'}
        </Tag>
      </div>
    </div>
  );
}

export default function FinanceSettingsView() {
  const { data: categories = [], isLoading, isError } = useCashFlowCategories();
  const [flags, setFlags] = useLocalStorageState<MockFinanceFlags>(
    'salon-settings-finance-flags-v1',
    DEFAULT_FINANCE_FLAGS,
  );

  return (
    <div className="space-y-4">
      <div className="bg-surface border-outline flex flex-wrap items-start justify-between gap-3 rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Wallet className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-on-surface text-base font-bold">Tài chính &amp; Quỹ</h2>
            <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
              Danh mục thu chi và quy tắc kiểm két. Danh mục được tải trực tiếp từ hệ thống.
            </p>
          </div>
        </div>
        {isLoading ? (
          <Tag variant="blue" size="md" shape="pill">
            Đang tải...
          </Tag>
        ) : isError ? (
          <Tag variant="error" size="md" shape="pill">
            Không tải được dữ liệu
          </Tag>
        ) : (
          <Tag variant="success" size="md" shape="pill" dot>
            Đã kết nối
          </Tag>
        )}
      </div>

      <SectionCard
        title="Danh mục thu chi"
        description="Bộ danh mục dùng để phân loại phiếu thu/chi và tính báo cáo lãi lỗ."
      >
        {isError ? (
          <p className="border-outline text-on-surface-variant rounded-lg border px-3 py-8 text-center text-xs">
            Không thể tải danh mục thu chi. Vui lòng thử lại sau.
          </p>
        ) : isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="border-outline bg-surface h-[116px] animate-pulse rounded-lg border"
              />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="border-outline text-on-surface-variant rounded-lg border border-dashed px-3 py-6 text-center text-xs">
            Chưa có danh mục thu chi nào.
          </p>
        ) : (
          <div className="space-y-5">
            {CATEGORY_GROUPS.map((group) => {
              const groupCategories = categories
                .filter((category) => category.category_type === group.type)
                .sort((a, b) => a.sort_order - b.sort_order);

              return (
                <div key={group.type} className="space-y-2.5">
                  <div>
                    <h4 className="text-on-surface text-xs font-bold">{group.title}</h4>
                    <p className="text-on-surface-variant mt-0.5 text-[11px]">
                      {group.description}
                    </p>
                  </div>
                  {groupCategories.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {groupCategories.map((category) => (
                        <CategoryCard key={category.id} category={category} />
                      ))}
                    </div>
                  ) : (
                    <p className="border-outline text-on-surface-variant rounded-lg border border-dashed px-3 py-4 text-center text-[11px]">
                      Chưa có danh mục nào trong nhóm này.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Chốt ca & kiểm két"
        description="Quy tắc kiểm soát tiền mặt cuối ca trước khi chốt doanh thu."
      >
        <div className="border-outline flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
          <div>
            <p className="text-on-surface text-xs font-semibold">Yêu cầu kiểm két cuối ca</p>
            <p className="text-on-surface-variant mt-1 text-[11px] leading-relaxed">
              Nhân viên phải khai báo tiền mặt thực tế trong két trước khi chốt ca.
            </p>
          </div>
          <Switch
            checked={flags.require_shift_closing}
            onCheckedChange={(checked) =>
              setFlags((current) => ({ ...current, require_shift_closing: checked }))
            }
          />
        </div>
      </SectionCard>
    </div>
  );
}
