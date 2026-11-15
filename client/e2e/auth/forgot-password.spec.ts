import { expect, test } from '@playwright/test';

const unauth = { cookies: [], origins: [] };

test.describe('E2E-FPW-001 quên mật khẩu (mock)', () => {
  test.use({ storageState: unauth });

  test(
    'E2E-FPW-001 gửi yêu cầu và quay lại đăng nhập',
    { tag: ['@p2', '@blocked-mock'] },
    async ({ page }) => {
      const phone = '0901234567';
      await page.goto('/forgot-password');
      await page.getByLabel('Số điện thoại').fill(phone);
      await page.getByRole('button', { name: 'Gửi mã đặt lại' }).click();

      await expect(page.getByRole('heading', { name: 'Đã gửi yêu cầu' })).toBeVisible();
      await expect(page.getByText(`Nếu số ${phone} tồn tại trong hệ thống`)).toBeVisible();

      await page.getByRole('button', { name: 'Gửi lại mã' }).click();
      await expect(page.getByRole('heading', { name: 'Quên mật khẩu' })).toBeVisible();

      await page.getByRole('link', { name: 'Quay lại đăng nhập' }).click();
      await expect(page).toHaveURL(/\/login$/);
    },
  );
});
