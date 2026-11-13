import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  getStaffsByOrgID,
  getStaffById,
  createStaff,
  updateStaff,
  getStaffLeaves,
  createStaffLeave,
  getStaffPayroll,
  createStaffPayroll,
  getStaffSalaryAdjustments,
  createStaffSalaryAdjustment,
  deleteStaffSalaryAdjustment,
  getStaffServiceHistory,
  type CreateStaffPayload,
  type UpdateStaffPayload,
  type CreateStaffLeavePayload,
  type CreateStaffSalaryAdjustmentPayload,
} from '@/services/staff';
import { queryKeys } from './query-keys';

type UseStaffsParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sort?: string;
};

type CreateStaffPayrollVars = {
  id: string;
  targetMonth: string;
};

type UseStaffServiceHistoryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

export function useStaff({ page, pageSize, search, status, sort }: UseStaffsParams) {
  return useQuery({
    queryKey: queryKeys.staff.list({ page, pageSize, search, status, sort }),
    queryFn: () => getStaffsByOrgID({ page, pageSize, search, status, sort }),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStaffDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.detail(id),
    queryFn: () => getStaffById(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => createStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    },
  });
}

export function useUpdateStaff(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStaffPayload) => updateStaff(id, payload),
    onSuccess: (staff) => {
      queryClient.setQueryData(queryKeys.staff.detail(id), staff);
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    },
  });
}

export function useStaffLeaves(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.leaves(id),
    queryFn: () => getStaffLeaves(id as string),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateStaffLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateStaffLeavePayload }) =>
      createStaffLeave(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.leaves(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.payrollByStaff(variables.id) });
    },
  });
}

export function useStaffPayroll(id: string | null | undefined, periodMonth?: string) {
  return useQuery({
    queryKey: queryKeys.staff.payroll(id, periodMonth),
    queryFn: () => getStaffPayroll(id as string, { periodMonth: periodMonth as string }),
    enabled: !!id && !!periodMonth,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateStaffPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetMonth }: CreateStaffPayrollVars) =>
      createStaffPayroll(id, targetMonth),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.payrollByStaff(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.salaryAdjustments() });
    },
  });
}

export function useStaffSalaryAdjustments(
  id: string | null | undefined,
  periodMonth: string,
) {
  return useQuery({
    queryKey: queryKeys.staff.salaryAdjustment(id, periodMonth),
    queryFn: () => getStaffSalaryAdjustments(id as string, periodMonth),
    enabled: !!id && !!periodMonth,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCreateStaffSalaryAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateStaffSalaryAdjustmentPayload) =>
      createStaffSalaryAdjustment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.salaryAdjustments() });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.payrolls() });
    },
  });
}

export function useDeleteStaffSalaryAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaffSalaryAdjustment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.salaryAdjustments() });
    },
  });
}

export function useStaffServiceHistory(
  id: string | null | undefined,
  { page = 1, pageSize = 10, search = '', dateFrom, dateTo }: UseStaffServiceHistoryParams = {},
) {
  return useQuery({
    queryKey: queryKeys.staff.serviceHistory(id, { page, pageSize, search, dateFrom, dateTo }),
    queryFn: () =>
      getStaffServiceHistory(id as string, { page, pageSize, search, dateFrom, dateTo }),
    enabled: !!id,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export type { CreateStaffPayload, UpdateStaffPayload };
