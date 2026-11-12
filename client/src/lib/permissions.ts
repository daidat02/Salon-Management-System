export type AuthRole = 'owner' | 'manager' | 'receptionist';

export const AUTH_ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ salon',
  manager: 'Quản lý salon',
  receptionist: 'Lễ tân',
};

export type Permission =
  | 'catalog:write'
  | 'inventory:write'
  | 'cashflow:write'
  | 'cashflow:create'
  | 'settings:write'
  | 'settings:view'
  | 'staff:write'
  | 'staff:delete'
  | 'payroll:manage'
  | 'customer:delete'
  | 'appointment:delete'
  | 'order:cancel'
  | 'order:refund'
  | 'reports:view'
  | 'reports:profit-view';

const OWNER_PERMISSIONS: Permission[] = [
  'catalog:write',
  'inventory:write',
  'cashflow:write',
  'cashflow:create',
  'settings:write',
  'settings:view',
  'staff:write',
  'staff:delete',
  'payroll:manage',
  'customer:delete',
  'appointment:delete',
  'order:cancel',
  'order:refund',
  'reports:view',
  'reports:profit-view',
];

const MANAGER_PERMISSIONS: Permission[] = [
  'catalog:write',
  'inventory:write',
  'cashflow:write',
  'cashflow:create',
  'settings:write',
  'settings:view',
  'staff:write',
  'customer:delete',
  'appointment:delete',
  'order:cancel',
  'reports:view',
  'reports:profit-view',
];

const RECEPTIONIST_PERMISSIONS: Permission[] = ['cashflow:create'];

const ROLE_PERMISSIONS: Record<AuthRole, Permission[]> = {
  owner: OWNER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  receptionist: RECEPTIONIST_PERMISSIONS,
};

const ROUTE_ACCESS: { prefix: string; roles: AuthRole[] }[] = [
  { prefix: '/settings', roles: ['owner', 'manager'] },
  { prefix: '/reports', roles: ['owner', 'manager'] },
  { prefix: '/inventory/inbound', roles: ['owner', 'manager'] },
  { prefix: '/inventory/outbound', roles: ['owner', 'manager'] },
  { prefix: '/staff', roles: ['owner', 'manager'] },
];

export function hasPermission(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role as AuthRole]?.includes(permission) ?? false;
}

export function canAccessRoute(pathname: string, role: string | null | undefined): boolean {
  if (!role) return false;
  const restricted = ROUTE_ACCESS.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`),
  );
  if (!restricted) return true;
  return restricted.roles.includes(role as AuthRole);
}
