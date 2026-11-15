import { expect, test } from '@playwright/test';
import { roleStorageState } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';

test.describe('E2E-OVW overview', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-OVW-001 render dữ liệu tổng quan', { tag: ['@smoke', '@p0'] }, async ({ page }) => {
    await page.goto('/overview');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào buổi sáng');

    const kpi = page.getByTestId('overview-kpi');
    for (const label of [
      'Doanh thu hôm nay',
      'Giá trị đơn trung bình',
      'Lịch hẹn hôm nay',
      'Tổng đơn hàng',
    ]) {
      await expect(kpi.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: 'Doanh thu 7 ngày qua' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cảnh báo tồn kho' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lịch hẹn hôm nay' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Đơn hàng gần đây' })).toBeVisible();

    await expect(page.getByText(/Không tải được số liệu tổng quan/)).toHaveCount(0);
  });

  test('E2E-OVW-002 lỗi tải dữ liệu và thử lại', { tag: '@p0' }, async ({ page }) => {
    let failing = true;
    let calls = 0;

    await page.route('**/api/v1/overview**', async (route) => {
      calls += 1;
      if (failing) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ code: 500, message: 'Lỗi test overview' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/overview');

    const banner = page.getByText(/Không tải được số liệu tổng quan/);
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Thử lại' })).toBeVisible();

    const callsBeforeRetry = calls;
    failing = false;
    await page.getByRole('button', { name: 'Thử lại' }).click();

    await expect(banner).toHaveCount(0);
    await expect(page.getByTestId('overview-kpi')).toBeVisible();
    await expect(page.getByText('Doanh thu hôm nay', { exact: true })).toBeVisible();
    expect(calls).toBeGreaterThan(callsBeforeRetry);
  });

  test('E2E-OVW-003 điều hướng từ overview', { tag: '@p0' }, async ({ page }) => {
    await page.goto('/overview');
    await expect(page.getByRole('heading', { name: 'Lịch hẹn hôm nay' })).toBeVisible();

    const appointmentsLink = page
      .locator('a[href="/appointments"]')
      .filter({ hasText: 'Xem tất cả' });
    await expect(appointmentsLink).toBeVisible();
    await appointmentsLink.click();
    await expect(page).toHaveURL(/\/appointments$/);

    await page.goto('/overview');
    const ordersLink = page.locator('a[href="/orders"]').filter({ hasText: 'Xem tất cả' });
    await expect(ordersLink).toBeVisible();
    await ordersLink.click();
    await expect(page).toHaveURL(/\/orders$/);

    await page.goto('/overview');
    const inboundLink = page.getByRole('link', { name: '+ Nhập kho ngay' });
    await expect(inboundLink).toHaveAttribute('href', '/inventory/inbound');
    await inboundLink.click();
    await expect(page).toHaveURL(/\/inventory\/inbound$/);
  });
});
