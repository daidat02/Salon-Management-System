// Dashboard được proxy rewrite từ URL ngoài (không /app) sang folder nội bộ
// `/app/*`. `usePathname()` trả path khác nhau giữa SSR (source `/app/overview`)
// và client (URL `/overview`), gây lệch active nav / phân quyền và hydration
// mismatch. Chuẩn hoá về cùng một dạng.
const INTERNAL_APP_BASE = '/app';

export function normalizeAppPathname(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  if (pathname === INTERNAL_APP_BASE) return '/';
  if (pathname.startsWith(`${INTERNAL_APP_BASE}/`)) {
    return pathname.slice(INTERNAL_APP_BASE.length);
  }
  return pathname;
}
