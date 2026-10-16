'use client';

export type CashflowType = 'thu' | 'chi';

export type CashflowStatus = 'Đã duyệt' | 'Chờ duyệt';

export type CashflowVoucher = {
  id: string;
  date: string; // dd/MM/yyyy
  time: string; // HH:mm
  code: string; // PT-2410-001 / PC-2410-001
  type: CashflowType;
  category: string;
  description: string;
  creator: string;
  amount: number; // số dương, dấu thể hiện qua type
  paymentMethod: string;
  status: CashflowStatus;
};

export type ExpenseSlice = {
  id: string;
  label: string;
  percent: number;
  amount: number;
  colorClass: string; // tailwind bg-*
};

export type CashflowDayPoint = {
  day: string; // T2 (18/10)
  thu: number; // triệu đồng
  chi: number;
};
