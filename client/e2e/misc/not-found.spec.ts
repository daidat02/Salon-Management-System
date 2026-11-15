import { expect, test } from '@playwright/test';
import { roleStorageState } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';

test.describe('E2E-404-001 trang không tìm thấy', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-404-001 hiển thị 404 và các link điều hướng', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/khong-ton-tai');

    await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
    await expect(page.getByText('Mã lỗi: 404 • NOT_FOUND')).toBeVisible();

    const dashboardLink = page.getByRole('link', { name: 'Về Dashboard' });
    await expect(dashboardLink).toHaveAttribute('href', '/overview');

    const homeLink = page.getByRole('link', { name: 'Về trang chủ' });
    await expect(homeLink).toHaveAttribute('href', '/landing');

    const supportLink = page.getByRole('link', { name: '0900 000 000' });
    await expect(supportLink).toHaveAttribute('href', 'tel:0900000000');

    await dashboardLink.click();
    await expect(page).toHaveURL(/\/overview$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chào buổi sáng');
  });
});
