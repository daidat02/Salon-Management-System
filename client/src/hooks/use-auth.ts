import { useCallback } from 'react';
import { useAppSelector } from '@/store/hook';
import {
  selectAuthStatus,
  selectAuthUser,
  selectIsAuthenticated,
  type AuthUser,
} from '@/store/slices/authSlice';
import {
  AUTH_ROLE_LABELS,
  canAccessRoute,
  hasPermission,
  type AuthRole,
  type Permission,
} from '@/lib/permissions';

export { AUTH_ROLE_LABELS };
export type { AuthRole };

type UseAuthResult = {
  user: AuthUser | null;
  role: AuthRole | string | null;
  roleLabel: string;
  displayName: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  canAccessRoute: (pathname: string) => boolean;
};

export default function useAuth(): UseAuthResult {
  const user = useAppSelector(selectAuthUser);
  const status = useAppSelector(selectAuthStatus);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = user?.role ?? null;
  const can = useCallback((permission: Permission) => hasPermission(role, permission), [role]);
  const checkRouteAccess = useCallback(
    (pathname: string) => canAccessRoute(pathname, role),
    [role],
  );

  return {
    user,
    role,
    roleLabel: role ? (AUTH_ROLE_LABELS[role] ?? role) : '',
    displayName: user?.full_name?.trim() || user?.phone_number || '',
    isAuthenticated,
    isLoading: status === 'loading',
    can,
    canAccessRoute: checkRouteAccess,
  };
}
