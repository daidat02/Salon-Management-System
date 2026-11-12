import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  disableDemoData,
  getBookingSettings,
  getGeneralSettings,
  getNotificationSettings,
  getPaymentSettings,
  updateBookingSettings,
  updateGeneralSettings,
  updateNotificationSettings,
  updatePaymentSettings,
} from '@/services/setting';

export function useGeneralSettings() {
  return useQuery({
    queryKey: ['settings', 'general'],
    queryFn: getGeneralSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useBookingSettings() {
  return useQuery({
    queryKey: ['settings', 'booking'],
    queryFn: getBookingSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['settings', 'payment'],
    queryFn: getPaymentSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['settings', 'notifications'],
    queryFn: getNotificationSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'notifications'] });
    },
  });
}

export function useUpdateGeneralSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateGeneralSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'general'] });
    },
  });
}

export function useUpdateBookingSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBookingSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'booking'] });
    },
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePaymentSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'payment'] });
    },
  });
}

export function useDisableDemoData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disableDemoData,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
