import {
  Staff,
  StaffEmploymentType,
  StaffGender,
  StaffLeave,
  StaffLeaveType,
  StaffPayroll,
  StaffSalaryAdjustment,
  StaffSalaryAdjustmentType,
  StaffServiceHistoryResponse,
} from '@/types/staff';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';

export type GetStaffsParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: string;
};

export const getStaffsByOrgID = async ({
  page = 1,
  pageSize = 10,
  search = '',
  status = '',
  sort = 'created_at_desc',
}: GetStaffsParams = {}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Staff>>>(`/staff`, {
    params: {
      page,
      page_size: pageSize,
      search: search || undefined,
      status: status || undefined,
      sort,
    },
  });
  // Backend wraps pagination.Result inside SuccessResponse.Data
  // => res.data.data = { data: Staff[], page, page_size, total, total_pages }
  return res.data.data;
};

export const getStaffById = async (id: string) => {
  const res = await apiClient.get<ApiResponse<Staff>>(`/staff/${id}`);
  return res.data.data;
};

export type GetStaffPayrollParams = {
  dateFrom?: string;
  dateTo?: string;
  standardWorkingDays?: number;
};

export const getStaffPayroll = async (id: string, params: GetStaffPayrollParams = {}) => {
  const res = await apiClient.get<ApiResponse<StaffPayroll>>(`/staff/${id}/payroll`, {
    params: {
      date_from: params.dateFrom,
      date_to: params.dateTo,
      standard_working_days: params.standardWorkingDays,
    },
  });
  return res.data.data;
};

export const getStaffSalaryAdjustments = async (id: string, periodMonth: string) => {
  const res = await apiClient.get<ApiResponse<StaffSalaryAdjustment[]>>(
    `/staff/${id}/salary-adjustments`,
    { params: { period_month: periodMonth } },
  );
  return res.data.data ?? [];
};

export const createStaffPayroll = async (id: string, targetMonth: string) => {
  const res = await apiClient.post<ApiResponse<null>>(`/staff/${id}/payroll`, {
    target_month: targetMonth,
  });
  return res.data.data;
};

export type CreateStaffSalaryAdjustmentPayload = {
  staff_id: string;
  adjustment_type: StaffSalaryAdjustmentType;
  amount: number;
  reason: string;
  effective_date: string;
};

export const createStaffSalaryAdjustment = async (payload: CreateStaffSalaryAdjustmentPayload) => {
  const res = await apiClient.post<ApiResponse<null>>('/staff/salary-adjustment', payload);
  return res.data.data;
};

export const deleteStaffSalaryAdjustment = async (id: string) => {
  const res = await apiClient.delete<ApiResponse<null>>(`/staff/salary-adjustment/${id}`);
  return res.data.data;
};

export type GetStaffServiceHistoryParams = {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export const getStaffServiceHistory = async (
  id: string,
  {
    dateFrom,
    dateTo,
    search = '',
    page = 1,
    pageSize = 10,
  }: GetStaffServiceHistoryParams = {},
) => {
  const res = await apiClient.get<ApiResponse<StaffServiceHistoryResponse>>(
    `/staff/${id}/service-history`,
    {
      params: {
        date_from: dateFrom,
        date_to: dateTo,
        search: search || undefined,
        page,
        page_size: pageSize,
      },
    },
  );
  return res.data.data;
};

export type CreateStaffPayload = {
  full_name: string;
  phone: string;
  email?: string;
  birth_date?: string | null;
  gender?: StaffGender | '';
  address?: string;
  position: string;
  employment_type?: StaffEmploymentType | '';
  commission_rate: number;
  base_salary?: number;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  status: Staff['status'];
  hire_date?: string | null;
};


export type UpdateStaffPayload = {
  code: string;
  full_name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  gender: StaffGender | '';
  address: string;
  position: string;
  employment_type: StaffEmploymentType | '';
  commission_rate: number;
  base_salary: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  status: Staff['status'];
  hire_date: string | null;
};

export const updateStaff = async (id: string, payload: UpdateStaffPayload) => {
  const res = await apiClient.put<ApiResponse<Staff>>(`/staff/${id}`, payload);
  return res.data.data;
};

export const createStaff = async (payload: CreateStaffPayload) => {
  const res = await apiClient.post<ApiResponse<Staff>>('/staff', payload);
  return res.data.data;
};

export const getStaffLeaves = async (id: string) => {
  const res = await apiClient.get<ApiResponse<StaffLeave[]>>(`/staff/${id}/leaves`);
  return res.data.data ?? [];
};

export type CreateStaffLeavePayload = {
  leave_type: StaffLeaveType;
  start_date: string;
  end_date: string;
  note?: string;
};

export const createStaffLeave = async (id: string, payload: CreateStaffLeavePayload) => {
  const res = await apiClient.post<ApiResponse<StaffLeave>>(`/staff/${id}/leaves`, payload);
  return res.data.data;
};
