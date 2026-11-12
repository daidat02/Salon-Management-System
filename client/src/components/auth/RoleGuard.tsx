'use client';

import { usePathname } from 'next/navigation';
import AccessDenied from './AccessDenied';
import useAuth from '@/hooks/use-auth';
import { normalizeAppPathname } from '@/lib/pathname';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = normalizeAppPathname(usePathname());
  const { user, canAccessRoute } = useAuth();

  if (!user) return null;
  if (!canAccessRoute(pathname)) return <AccessDenied />;

  return <>{children}</>;
}
