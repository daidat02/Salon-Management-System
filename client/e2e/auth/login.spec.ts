import { expect, test } from '@playwright/test';
import { roleStorageState } from '../fixtures/test';
import { loginAs } from '../support/auth';
import { ACCOUNTS, APP_URL, hasCredentials } from '../support/env';

const unauth = { cookies: [], origins: [] };

test.describe('E2E-AUTH-001..010 Đăng nhập / phiên', () => {
  test.skip(!hasCredentials('owner'), 'Chưa cấu hình tài khoản E2E owner');
  test.use({ storageState: unauth });

  test('E2E-AUTH-001 đăng nhập thành công', { tag: ['@smoke', '@p0'] }, async ({ page, context }) => {
    await loginAs(page, 'owner');

    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào buổi sáng');

    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === 'refresh_token'))
      .toBe(true);
  });

  test('E2E-AUTH-002 đăng nhập sai mật khẩu', { tag: '@p0' }, async ({ page, context }) => {
    await page.goto('/login');
    await page.getByLabel('Số điện thoại').fill(ACCOUNTS.owner!.phone);
    await page.getByLabel('Mật khẩu', { exact: true }).fill('sai-mat-khau-123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page.getByText(/Mật khẩu không đúng|Đăng nhập thất bại/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Đăng nhập', exact: true })).toBeEnabled();
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === 'refresh_token'))
      .toBe(false);
  });

  test('E2E-AUTH-003 tôn trọng ?next', { tag: '@p0' }, async ({ page }) => {
    await loginAs(page, 'owner', { next: '/orders' });

    await expect(page).toHaveURL(/\/orders$/);

    await page.goto('/login?next=%2Fappointments%3Fstatus%3Dconfirmed');
    await page.getByLabel('Số điện thoại').fill(ACCOUNTS.owner!.phone);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(ACCOUNTS.owner!.password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

    await expect(page).toHaveURL(/\/appointments\?status=confirmed$/);
  });

  test('E2E-AUTH-004 ghi nhớ đăng nhập', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('checkbox', { name: 'Ghi nhớ đăng nhập' })).toBeChecked();

    await loginAs(page, 'owner');
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem('access_token')))
      .toBeTruthy();

    await page.reload();
    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào buổi sáng');

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login$/);
    const tokens = await page.evaluate(() => ({
      session: sessionStorage.getItem('access_token'),
      local: localStorage.getItem('access_token'),
    }));
    expect(tokens.session).toBeNull();
    expect(tokens.local).toBeNull();
  });

  test('E2E-AUTH-005 đăng xuất', { tag: ['@smoke', '@p0'] }, async ({ page, context }) => {
    await loginAs(page, 'owner');
    await expect(page).toHaveURL(/\/overview$/);

    await page.getByRole('button', { name: 'Đăng xuất' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect
      .poll(async () => (await context.cookies()).some((c) => c.name === 'refresh_token'))
      .toBe(false);

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login\?next=%2Forders$/);
  });
});

test.describe('E2E-AUTH-006 guard chưa đăng nhập', () => {
  test.use({ storageState: unauth });

  test('E2E-AUTH-006 chuyển hướng kèm query', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/orders?status=completed');

    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get('next')).toBe('/orders?status=completed');

    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get('next')).toBe('/');
  });
});

test.describe('E2E-AUTH-007 refresh access token', () => {
  test.skip(!hasCredentials('owner'), 'Chưa cấu hình tài khoản E2E owner');
  test.use({ storageState: unauth });

  test('E2E-AUTH-007 tự refresh khi thiếu access token', { tag: '@p0' }, async ({ page, context }) => {
    await loginAs(page, 'owner');
    await page.goto('/orders');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const refreshResponse = page.waitForResponse(
      (res) => res.url().includes('/refresh-token') && res.request().method() === 'POST',
    );
    await page.evaluate(() => sessionStorage.removeItem('access_token'));
    await page.reload();

    expect((await refreshResponse).status()).toBe(200);
    await expect(page).toHaveURL(/\/orders$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await context.clearCookies();
    await context.addCookies([
      {
        name: 'refresh_token',
        value: 'invalid-refresh-token',
        url: APP_URL,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.evaluate(() => sessionStorage.removeItem('access_token'));
    await page.reload();

    await expect(page).toHaveURL(/\/login\?/);
    expect(new URL(page.url()).searchParams.get('next')).toBe('/orders');
  });
});

test.describe('E2E-AUTH-008 root redirect', () => {
  test.use({ storageState: roleStorageState('owner') });

  test('E2E-AUTH-008 / chuyển về /overview khi đã đăng nhập', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào buổi sáng');
  });
});
