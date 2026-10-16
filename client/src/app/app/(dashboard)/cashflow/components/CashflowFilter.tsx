'use client';

import DashToolbar from '@/components/dashboard/DashToolbar';
import { CASHFLOW_CATEGORIES, CASHFLOW_PAYMENT_METHODS } from './cashflowData';

type CashflowFilterProps = {
  /** '' = tất cả, 'thu' = phiếu thu, 'chi' = phiếu chi */
  voucherType: string;
  onVoucherTypeChange: (value: string) => void;
  counts: { all: number; thu: number; chi: number };
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  paymentMethod: string;
  onPaymentChange: (value: string) => void;
  onReset: () => void;
};

export default function CashflowFilter({
  voucherType,
  onVoucherTypeChange,
  counts,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  paymentMethod,
  onPaymentChange,
  onReset,
}: CashflowFilterProps) {
  return (
    <DashToolbar
      searchPlaceholder="Tìm theo mã phiếu, người tạo, nội dung..."
      searchValue={search}
      onSearchChange={onSearchChange}
      filters={[
        {
          id: 'voucherType',
          placeholder: 'Tất cả phiếu',
          value: voucherType || undefined,
          widthClass: 'sm:w-44',
          options: [
            { value: '', label: `Tất cả (${counts.all})` },
            { value: 'thu', label: `Phiếu Thu (+) (${counts.thu})` },
            { value: 'chi', label: `Phiếu Chi (-) (${counts.chi})` },
          ],
          onValueChange: onVoucherTypeChange,
        },
        {
          id: 'category',
          placeholder: 'Tất cả danh mục',
          value: category || undefined,
          widthClass: 'sm:w-52',
          options: [
            { value: '', label: 'Tất cả danh mục' },
            ...CASHFLOW_CATEGORIES.map((c) => ({ value: c, label: c })),
          ],
          onValueChange: onCategoryChange,
        },
        {
          id: 'payment',
          placeholder: 'Tất cả phương thức',
          value: paymentMethod || undefined,
          widthClass: 'sm:w-48',
          options: [
            { value: '', label: 'Tất cả phương thức' },
            ...CASHFLOW_PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
          ],
          onValueChange: onPaymentChange,
        },
      ]}
      onRefresh={() => onReset()}
      onReset={onReset}
    />
  );
}
