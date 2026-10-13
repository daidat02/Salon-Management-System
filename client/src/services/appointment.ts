import { Appointment } from '@/types/appointment';
import { ApiResponse, PaginationResult } from '@/types/response';
import apiClient from './apiClient';
import { API_ENDPOINTS } from '@/constants';

export type GetAppointmentsParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  /**
   * ISO8601 hoặc YYYY-MM-DD (server tự parse).
   * Lưu ý: server so sánh timestamp chính xác, muốn lọc cả ngày thì
   * truyền to = cuối ngày (VD from=2026-10-11, to=2026-10-11T23:59:59).
   */
  from?: string;
  to?: string;
};

export const getAppointmentsByOrgID = async ({
  page = 1,
  pageSize = 10,
  status = '',
  from = '',
  to = '',
}: GetAppointmentsParams = {}) => {
  const res = await apiClient.get<ApiResponse<PaginationResult<Appointment>>>(
    API_ENDPOINTS.APPOINTMENTS.GET_APPOINTMENTS,
    {
      params: {
        page,
        page_size: pageSize,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      },
    },
  );
  // Backend wraps pagination.Result inside SuccessResponse.Data
  // => res.data.data = { data: Appointment[], page, page_size, total, total_pages }
  return res.data.data;
};
