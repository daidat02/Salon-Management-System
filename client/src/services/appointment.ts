import {
  Appointment,
  AppointmentDetail,
  AppointmentSource,
  AppointmentStatus,
  WeeklySchedule,
} from '@/types/appointment';
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
  /** Tìm theo mã lịch, tên/SĐT khách, tên nhân viên. */
  search?: string;
};

export const getAppointmentsByOrgID = async ({
  page = 1,
  pageSize = 10,
  status = '',
  from = '',
  to = '',
  search = '',
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
        search: search || undefined,
      },
    },
  );
  // Backend wraps pagination.Result inside SuccessResponse.Data
  // => res.data.data = { data: Appointment[], page, page_size, total, total_pages }
  return res.data.data;
};

/** Lấy lịch hẹn của tuần (server tách sẵn theo từng ngày, bắt đầu Thứ 2). */
export const getWeeklySchedule = async (weekStart?: string) => {
  const res = await apiClient.get<ApiResponse<WeeklySchedule>>(
    API_ENDPOINTS.APPOINTMENTS.GET_WEEKLY_SCHEDULE,
    {
      params: { week_start: weekStart || undefined },
    },
  );
  return res.data.data;
};

export const getAppointmentDetail = async (id: string) => {
  const res = await apiClient.get<ApiResponse<AppointmentDetail>>(
    API_ENDPOINTS.APPOINTMENTS.GET_APPOINTMENT_DETAIL(id),
  );
  const detail = res.data.data;
  return {
    appointment: detail.appointment,
    items: detail.items ?? [],
  };
};

export type CreateAppointmentItemPayload = {
  item_type: 'service' | 'product';
  service_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
};

export type CreateAppointmentPayload = {
  customer_name: string;
  customer_phone: string;
  staff_id?: string;
  start_time: string;
  end_time: string;
  status?: AppointmentStatus;
  source?: AppointmentSource;
  note?: string;
  items: CreateAppointmentItemPayload[];
};

export const createAppointment = async (payload: CreateAppointmentPayload) => {
  const res = await apiClient.post<ApiResponse<Appointment>>(
    API_ENDPOINTS.APPOINTMENTS.GET_APPOINTMENTS,
    payload,
  );
  return res.data.data;
};

export const updateAppointment = async (id: string, payload: CreateAppointmentPayload) => {
  const res = await apiClient.put<ApiResponse<Appointment>>(
    API_ENDPOINTS.APPOINTMENTS.UPDATE_APPOINTMENT(id),
    payload,
  );
  return res.data.data;
};

export type RescheduleAppointmentPayload = {
  start_time: string;
  end_time: string;
};

export const rescheduleAppointment = async (
  id: string,
  payload: RescheduleAppointmentPayload,
) => {
  const res = await apiClient.put<ApiResponse<Appointment>>(
    API_ENDPOINTS.APPOINTMENTS.RESCHEDULE_APPOINTMENT(id),
    payload,
  );
  return res.data.data;
};

export const cancelAppointment = async (id: string, reason?: string) => {
  const res = await apiClient.post<ApiResponse<Appointment>>(
    API_ENDPOINTS.APPOINTMENTS.CANCEL_APPOINTMENT(id),
    { reason: reason ?? '' },
  );
  return res.data.data;
};
