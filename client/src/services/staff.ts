import { Staff, StaffEmploymentType, StaffGender } from '@/types/staff';
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


export const createStaff = async (payload: CreateStaffPayload) => {
  const res = await apiClient.post<ApiResponse<Staff>>('/staff', payload);
  return res.data.data;
};
