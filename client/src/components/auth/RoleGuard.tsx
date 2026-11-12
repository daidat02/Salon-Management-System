'use client';

import { usePathname } from 'next/navigation';
import AccessDenied from './AccessDenied';
import useAuth from '@/hooks/use-auth';

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, canAccessRoute } = useAuth();

  if (!user) return null;
  if (!canAccessRoute(pathname)) return <AccessDenied />;

  return <>{children}</>;
}
