import { ApiResponse } from '@/types/response';
import {
  BookingSettingsResponse,
  GeneralSettingsResponse,
  NotificationSettingsResponse,
  PaymentSettingsResponse,
} from '@/types/setting';
import { API_ENDPOINTS } from '@/constants';
import apiClient from './apiClient';

export const getGeneralSettings = async () => {
  const res = await apiClient.get<ApiResponse<GeneralSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.GET_GENERAL,
  );
  return res.data.data;
};

export const updateGeneralSettings = async (payload: GeneralSettingsResponse) => {
  const res = await apiClient.put<ApiResponse<GeneralSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.UPDATE_GENERAL,
    payload,
  );
  return res.data.data;
};

export const getBookingSettings = async () => {
  const res = await apiClient.get<ApiResponse<BookingSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.GET_BOOKING,
  );
  return res.data.data;
};

export const updateBookingSettings = async (payload: BookingSettingsResponse) => {
  const res = await apiClient.put<ApiResponse<BookingSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.UPDATE_BOOKING,
    payload,
  );
  return res.data.data;
};

export const getPaymentSettings = async () => {
  const res = await apiClient.get<ApiResponse<PaymentSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.GET_PAYMENT,
  );
  return res.data.data;
};

export const updatePaymentSettings = async (payload: PaymentSettingsResponse) => {
  const res = await apiClient.put<ApiResponse<PaymentSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.UPDATE_PAYMENT,
    payload,
  );
  return res.data.data;
};

export const getNotificationSettings = async () => {
  const res = await apiClient.get<ApiResponse<NotificationSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.GET_NOTIFICATIONS,
  );
  return res.data.data;
};

export const updateNotificationSettings = async (payload: NotificationSettingsResponse) => {
  const res = await apiClient.put<ApiResponse<NotificationSettingsResponse>>(
    API_ENDPOINTS.SETTINGS.UPDATE_NOTIFICATIONS,
    payload,
  );
  return res.data.data;
};
