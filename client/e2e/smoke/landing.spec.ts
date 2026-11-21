import { expect, test } from '@playwright/test';
import { APP_URL, LANDING_URL } from '../support/env';

test.describe('Landing', () => {
  test(
    'E2E-LANDING-001 hiển thị landing page công khai',
    { tag: ['@smoke', '@p2'] },
    async ({ page }) => {
      const rootUrl = new URL('/', LANDING_URL).toString();
      await page.goto(rootUrl);

      await expect(page).toHaveURL(/\$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        'VietOps — Vietnam Service Operations Platform',
      );
      await expect(page.getByText('VietOps — Vietnam Service Operations Platform')).toBeVisible();

      const cta = page.getByRole('button', { name: 'Đăng Nhập' });
      await expect(cta).toHaveAttribute('href', APP_URL);
    },
  );
});
