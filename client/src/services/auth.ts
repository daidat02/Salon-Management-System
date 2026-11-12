import { AuthUser } from '@/store/slices/authSlice';
import apiClient, { getApiErrorMessage, setApiAccessToken } from './apiClient';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '@/constants';

const { AUTH } = API_ENDPOINTS;
export const logoutUser = createAsyncThunk(AUTH.LOGOUT, async () => {
  try {
    await apiClient.post(AUTH.LOGOUT);
  } catch {
    // Logout phía server là best-effort; client vẫn phải xóa phiên cục bộ.
  }
  setApiAccessToken(null);
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('access_token');
    } catch {}
  }
  return true;
});

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload: { phone: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post(AUTH.LOGIN, payload);
      const user = res.data?.data?.user as AuthUser;
      const accessToken = (res.data?.data?.access_token ?? '') as string;
      setApiAccessToken(accessToken || null);
      console.log('loginUser: user', user);
      return { user, accessToken };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Đăng nhập thất bại'));
    }
  },
);
