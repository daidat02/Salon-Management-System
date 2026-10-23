export type CashFlowKind = 'income' | 'expense';

export type CashFlowStatus = 'pending' | 'approved' | 'cancelled';

export type FundType = 'cash' | 'bank' | 'e_wallet';

export interface CashFlow {
  id: string;
  organization_id: string;
  code: string;
  kind: CashFlowKind;
  category_id: string | null;
  category_name: string | null;
  fund_id: string;
  fund_name: string;
  amount: number;
  description: string | null;
  occurred_at: string | null;
  status: CashFlowStatus;
  order_id: string | null;
  inventory_document_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CashFlowCategory {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  kind: CashFlowKind;
  category_type: 'revenue' | 'operating_expense' | 'non_pnl';
  is_system: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface Fund {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  fund_type: FundType;
  bank_name: string | null;
  account_number: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  is_default: boolean;
  is_configured: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface FundStats {
  id: string;
  organization_id: string;
  code: string;
  fund_type: FundType;
  name: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  is_default: boolean;
  is_configured: boolean;
}

export interface CashFlowStats {
  total_income: number;
  total_operating_expense: number;
  total_non_pnl_expense: number;
  funds: FundStats[];
}
