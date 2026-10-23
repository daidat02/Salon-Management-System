import { CashFlow, CashFlowCategory, CashFlowKind, CashFlowStats, Fund } from '@/types/cashflow';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';

const CASHFLOWS_ENDPOINT = API_ENDPOINTS.CASHFLOWS;

export type GetCashFlowsParams = {
  search?: string;
  kind?: string;
  categoryId?: string;
  fundId?: string;
  status?: string;
  sortBy?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
};

export const getCashFlows = async ({
  search,
  kind,
  categoryId,
  fundId,
  status,
  sortBy,
  dateFrom,
  dateTo,
  page,
  pageSize,
}: GetCashFlowsParams) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<CashFlow>>>(
    CASHFLOWS_ENDPOINT.GET_LIST,
    {
      params: {
        search: search || undefined,
        kind: kind || undefined,
        category_id: categoryId || undefined,
        fund_id: fundId || undefined,
        status: status || undefined,
        sort_by: sortBy || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: page,
        page_size: pageSize,
      },
    },
  );

  return res.data.data;
};

export type GetAllCashFlowsParams = Omit<GetCashFlowsParams, 'page' | 'pageSize'>;

export const getAllCashFlows = async (params: GetAllCashFlowsParams) => {
  const pageSize = 100;
  let page = 1;
  const cashflows: CashFlow[] = [];

  while (true) {
    const result = await getCashFlows({ ...params, page, pageSize });
    cashflows.push(...result.data);

    if (result.data.length === 0 || page >= result.total_pages) break;
    page += 1;
  }

  return cashflows;
};

export type CreateCashFlowPayload = {
  kind: CashFlowKind;
  category_id: string | null;
  fund_id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
};

export const createCashFlow = async (payload: CreateCashFlowPayload) => {
  const res = await apiClient.post<ApiResponse<CashFlow>>(CASHFLOWS_ENDPOINT.CREATE, payload);
  return res.data.data;
};

export const approveCashFlow = async (cashflowId: string) => {
  const res = await apiClient.post<ApiResponse<{ id: string }>>(
    CASHFLOWS_ENDPOINT.APPROVE(cashflowId),
  );
  return res.data.data;
};

export type GetCashFlowStatsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export const getCashFlowStats = async ({ dateFrom, dateTo }: GetCashFlowStatsParams = {}) => {
  const res = await apiClient.get<ApiResponse<CashFlowStats>>(CASHFLOWS_ENDPOINT.GET_STATS, {
    params: {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    },
  });

  return res.data.data;
};

export const getCashFlowCategories = async (kind?: string) => {
  const res = await apiClient.get<ApiResponse<CashFlowCategory[]>>(
    CASHFLOWS_ENDPOINT.GET_CATEGORIES,
    {
      params: {
        kind: kind || undefined,
      },
    },
  );

  return res.data.data;
};

export const getFunds = async (activeOnly = true) => {
  const res = await apiClient.get<ApiResponse<Fund[]>>(CASHFLOWS_ENDPOINT.GET_FUNDS, {
    params: {
      active_only: activeOnly,
    },
  });

  return res.data.data;
};

export type CreateFundPayload = {
  code: string;
  name: string;
  fund_type: Fund['fund_type'];
  bank_name: string | null;
  account_number: string | null;
  opening_balance: number;
};

export type UpdateFundPayload = {
  name: string;
  bank_name: string | null;
  account_number: string | null;
  is_active: boolean;
};

export const createFund = async (payload: CreateFundPayload) => {
  const res = await apiClient.post<ApiResponse<Fund>>(
    CASHFLOWS_ENDPOINT.CREATE_FUND,
    payload,
  );
  return res.data.data;
};

export const updateFund = async (fundId: string, payload: UpdateFundPayload) => {
  const res = await apiClient.put<ApiResponse<Fund>>(
    CASHFLOWS_ENDPOINT.UPDATE_FUND(fundId),
    payload,
  );
  return res.data.data;
};

export const getFundMovementHistory = async () => {
  const res = await apiClient.get<ApiResponse<CashFlow[]>>(
    CASHFLOWS_ENDPOINT.GET_FUND_HISTORY,
  );

  return res.data.data;
};
