import type { Page } from '@playwright/test';
import { ACCOUNTS, type Role } from './env';
import { getToken } from './tokens';

/**
 * Nạp access token sẵn có vào sessionStorage trước khi app chạy.
 *
 * Refresh token bị rotate và thu hồi sau mỗi lần dùng, nên storageState dùng
 * chung giữa nhiều test sẽ hết hiệu lực sau test đầu tiên. Inject access token
 * (còn hạn 15 phút từ globalSetup) để test chỉ đọc dữ liệu không cần refresh.
 */
export async function injectAccessToken(page: Page, role: Role) {
  const { accessToken } = getToken(role);
  await page.addInitScript((token) => {
    sessionStorage.setItem('access_token', token);
  }, accessToken);
}

export async function loginAs(page: Page, role: Role, options: { next?: string } = {}) {
  const account = ACCOUNTS[role];
  if (!account) {
    throw new Error(`[e2e] Chưa cấu hình tài khoản cho role "${role}".`);
  }

  const loginPath = options.next
    ? `/login?next=${encodeURIComponent(options.next)}`
    : '/login';
  await page.goto(loginPath);
  await page.getByLabel('Số điện thoại').fill(account.phone);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}
