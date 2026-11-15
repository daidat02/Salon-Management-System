import { expect, test } from '@playwright/test';
import { APP_URL, LANDING_URL } from '../support/env';

test.describe('Landing', () => {
  test('E2E-LANDING-001 hiển thị landing page công khai', { tag: ['@smoke', '@p2'] }, async ({ page }) => {
    const rootUrl = new URL('/', LANDING_URL).toString();
    await page.goto(rootUrl);

    await expect(page).toHaveURL(/\/landing$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Salon Project — Landing Page',
    );
    await expect(
      page.getByText('Đây là trang chủ của website landing tại'),
    ).toBeVisible();

    const cta = page.getByRole('link', { name: 'Vào Dashboard', exact: true });
    await expect(cta).toHaveAttribute('href', APP_URL);

    const navDashboard = page.getByRole('link', { name: 'Dashboard', exact: true });
    await expect(navDashboard).toHaveAttribute('href', APP_URL);
  });
});
