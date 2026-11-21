import { expect, test } from '@playwright/test';
import { APP_URL, LANDING_URL } from '../support/env';

test.describe('Landing', () => {
  test(
    'E2E-LANDING-001 hiển thị landing page công khai',
    { tag: ['@smoke', '@p2'] },
    async ({ page }) => {
      const rootUrl = new URL('/', LANDING_URL).toString();
      await page.goto(rootUrl);

      await expect(page).toHaveURL(/\/$/);
      const heroHeading = page.getByRole('heading', { level: 1 });
      await expect(heroHeading).toContainText('VietOps');
      await expect(heroHeading).toContainText('Vietnam Service Operations Platform');

      const cta = page.getByRole('link', { name: 'Đăng Nhập' });
      await expect(cta).toHaveAttribute('href', `${APP_URL}/login`);
    },
  );
});
