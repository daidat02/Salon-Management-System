'use client';

import type { CashFlowKind, CashFlowStatus } from '@/types/cashflow';

export type CashflowType = CashFlowKind;

export type CashflowStatus = CashFlowStatus;

export type CashflowVoucher = {
  id: string;
  date: string; // dd/MM/yyyy
  time: string; // HH:mm
  code: string; // PT-2410-001 / PC-2410-001
  type: CashflowType;
  category: string;
  description: string;
  fund: string;
  amount: number; // số dương, dấu thể hiện qua type
  status: CashflowStatus;
};
