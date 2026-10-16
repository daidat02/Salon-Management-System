'use client';

import * as React from 'react';
import CashflowChart from './CashflowChart';
import ExpenseBreakdown from './ExpenseBreakdown';
import CashflowFilter from './CashflowFilter';
import CashflowTable from './CashflowTable';
import { CASHFLOW_VOUCHERS } from './cashflowData';

export default function CashflowView() {
  const [voucherType, setVoucherType] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState('');
  const [page, setPage] = React.useState(1);

  const counts = React.useMemo(
    () => ({
      all: CASHFLOW_VOUCHERS.length,
      thu: CASHFLOW_VOUCHERS.filter((v) => v.type === 'thu').length,
      chi: CASHFLOW_VOUCHERS.filter((v) => v.type === 'chi').length,
    }),
    [],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return CASHFLOW_VOUCHERS.filter((v) => {
      if (voucherType && v.type !== voucherType) return false;
      if (category && v.category !== category) return false;
      if (paymentMethod && v.paymentMethod !== paymentMethod) return false;
      if (!q) return true;
      return [v.code, v.creator, v.description, v.category]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [voucherType, search, category, paymentMethod]);

  const handleVoucherTypeChange = (v: string) => {
    setVoucherType(v);
    setPage(1);
  };
  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const handleCategoryChange = (v: string) => {
    setCategory(v);
    setPage(1);
  };
  const handlePaymentChange = (v: string) => {
    setPaymentMethod(v);
    setPage(1);
  };
  const handleReset = () => {
    setVoucherType('');
    setSearch('');
    setCategory('');
    setPaymentMethod('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CashflowChart />
        <ExpenseBreakdown />
      </div>
      <CashflowFilter
        voucherType={voucherType}
        onVoucherTypeChange={handleVoucherTypeChange}
        counts={counts}
        search={search}
        onSearchChange={handleSearchChange}
        category={category}
        onCategoryChange={handleCategoryChange}
        paymentMethod={paymentMethod}
        onPaymentChange={handlePaymentChange}
        onReset={handleReset}
      />
      <CashflowTable rows={filtered} page={page} onPageChange={setPage} />
    </div>
  );
}
