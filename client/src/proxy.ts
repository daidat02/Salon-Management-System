import { NextRequest, NextResponse } from 'next/server';

// Cấu hình domain. Dev mặc định app.localhost; prod đặt qua env (xem ticket 03).
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost';
const APP_SUBDOMAIN = process.env.NEXT_PUBLIC_APP_SUBDOMAIN || 'app';

// Folder nội bộ của dashboard trong src/app. URL ngoài không còn tiền tố này;
// proxy ánh xạ app.domain.com/<path> -> /app/<path>.
const INTERNAL_APP_BASE = '/app';

// Path công khai trên dashboard (URL ngoài, không có /app).
const PUBLIC_APP_PATHS = ['/login', '/register', '/forgot-password'];

// Subdomain cố định không phải app/landing, không được dùng làm slug tổ chức.
const RESERVED_SUBDOMAINS = new Set([
  'www',
  APP_SUBDOMAIN,
  'api',
  'admin',
  'static',
  'assets',
  'mail',
  'cdn',
  'docs',
  'status',
]);

function isPublicAppPath(pathname: string) {
  return PUBLIC_APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isLegacyAppPath(pathname: string) {
  return pathname === INTERNAL_APP_BASE || pathname.startsWith(`${INTERNAL_APP_BASE}/`);
}

function stripLegacyPrefix(pathname: string) {
  const stripped = pathname.slice(INTERNAL_APP_BASE.length);
  return stripped === '' ? '/' : stripped;
}

function buildExternalUrl(req: NextRequest, host: string, pathname: string, search: string) {
  const proto =
    req.headers.get('x-forwarded-proto') || (ROOT_DOMAIN === 'localhost' ? 'http' : 'https');
  // Tạo URL mới hoàn toàn từ proto và host (không kế thừa port 8080 của req.url)
  const url = new URL(`${proto}://${host}`);
  url.pathname = pathname;
  url.search = search;
  return url;
}

function redirectTo(req: NextRequest, host: string, pathname: string, search: string) {
  const url = buildExternalUrl(req, host, pathname, search);
  // Dùng 307 thay vì 308 để tránh trình duyệt cache cứng redirect khi thay đổi trạng thái đăng nhập
  return NextResponse.redirect(url, 307);
}

function rewriteToApp(req: NextRequest, pathname: string, search: string) {
  const target = `${INTERNAL_APP_BASE}${pathname === '/' ? '' : pathname}${search}`;
  return NextResponse.rewrite(new URL(target, req.url));
}

export function proxy(req: NextRequest) {
  const host = req.headers.get('host');
  if (!host) return NextResponse.next();

  const hostname = host.split(':')[0];
  const port = host.slice(hostname.length); // "" hoặc ":3000"

  const isRootHost = hostname === ROOT_DOMAIN;
  const isSubOfRoot = hostname.endsWith(`.${ROOT_DOMAIN}`);

  // Host không thuộc domain cấu hình (vd. IP LAN) → giữ hành vi path-based cũ.
  if (!isRootHost && !isSubOfRoot) return NextResponse.next();

  const sub = isRootHost ? '' : hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  const { pathname, search } = req.nextUrl;
  const appHost = `${APP_SUBDOMAIN}.${ROOT_DOMAIN}${port}`;

  // 1. Dashboard tại app.<root>.
  if (sub === APP_SUBDOMAIN) {
    // Link/bookmark cũ /app/* → bỏ tiền tố ngay trên subdomain này.
    if (isLegacyAppPath(pathname)) {
      return redirectTo(req, host, stripLegacyPrefix(pathname), search);
    }
    // Đã đăng nhập vào gốc app → vào thẳng dashboard.
    if (pathname === '/' && req.cookies.get('refresh_token')) {
      return redirectTo(req, host, '/overview', search);
    }
    // Chốt chặn vòng ngoài: chỉ đọc được cookie refresh_token httpOnly do Go set.
    // Verify access_token thật vẫn làm ở Server Component / route handler gọi API Go.
    if (!isPublicAppPath(pathname) && !req.cookies.get('refresh_token')) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', `${pathname}${search}`);
      return NextResponse.redirect(loginUrl, 307);
    }

    return rewriteToApp(req, pathname, search);
  }

  // 2. Root domain và www → landing; /app cũ đá sang subdomain app.
  if (sub === '' || sub === 'www') {
    if (isLegacyAppPath(pathname)) {
      return redirectTo(req, appHost, stripLegacyPrefix(pathname), search);
    }
    // Nếu người dùng gõ thẳng /landing thì đá về / cho đẹp URL (không bị trùng lặp nội dung)
    if (pathname === '/landing' || pathname.startsWith('/landing/')) {
      const cleanPath = pathname.replace(/^\/landing/, '') || '/';
      return redirectTo(req, host, cleanPath, search);
    }
    // Ánh xạ ngầm: http://localhost:3000/ -> src/app/landing
    const target = `/landing${pathname === '/' ? '' : pathname}${search}`;
    return NextResponse.rewrite(new URL(target, req.url));
  }

  // 3. Subdomain cố định khác (api/admin/...): không phục vụ trên Next.
  if (RESERVED_SUBDOMAINS.has(sub)) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // 4. Subdomain động ({slug}) dành cho trang đặt lịch — chưa mở (ticket 05).
  //    Tạm trả 404 thay vì để Next render nhầm route.
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  // Bỏ qua asset tĩnh và /api (dev rewrite sang backend Go xử lý riêng).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)'],
};
