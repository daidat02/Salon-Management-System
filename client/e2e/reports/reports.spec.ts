import fs from 'node:fs/promises';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';

type RevenueReportEnvelope = {
  data: {
    range: { from: string; to: string };
    kpi: {
      revenue: number;
      net_profit: number;
      operating_expense: number;
      margin: number;
    };
  };
};

function dayMonth(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

async function expectReportLoaded(page: import('@playwright/test').Page): Promise<void> {
  for (const label of [
    'Tổng doanh thu',
    'Lợi nhuận thuần',
    'Chi phí vận hành',
    'Tỷ suất lợi nhuận',
  ]) {
    await expect(
      page.getByRole('paragraph').filter({ hasText: new RegExp(`^${label}$`) }),
    ).toBeVisible();
  }
  await expect(page.getByText('Không tải được báo cáo doanh thu')).toHaveCount(0);
}

test.describe('E2E-RPT báo cáo doanh thu', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-RPT-001 tải báo cáo doanh thu và lợi nhuận', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/reports');
    await expectReportLoaded(page);

    for (const heading of [
      /Doanh thu & Lợi nhuận theo tháng năm \d{4}/,
      'Cơ cấu Doanh thu',
      'Phân rã Lợi nhuận',
      'Top 5 Dịch vụ bán chạy',
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: heading }),
      ).toBeVisible();
    }
  });

  test('E2E-RPT-002 lọc khoảng ngày', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/reports');
    await expectReportLoaded(page);

    await page.locator('button:has(svg.lucide-calendar-days)').first().click();
    await page.getByRole('button', { name: '7 ngày qua', exact: true }).click();

    const responsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/v1/reports/revenue' &&
        url.searchParams.has('date_from') &&
        url.searchParams.has('date_to')
      );
    });
    await page.getByRole('button', { name: 'Áp dụng', exact: true }).click();

    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as RevenueReportEnvelope;

    await expect(page).toHaveURL(/date_from=.*date_to=/);
    const url = new URL(page.url());
    const from = url.searchParams.get('date_from');
    const to = url.searchParams.get('date_to');
    expect(from).toBeTruthy();
    expect(to).toBeTruthy();
    expect(Date.parse(from as string)).toBeLessThanOrEqual(Date.parse(to as string));

    const rangeTag = `${dayMonth(body.data.range.from)} - ${dayMonth(body.data.range.to)}`;
    const topServices = page.locator('section').filter({ hasText: 'Top 5 Dịch vụ bán chạy' });
    await expect(topServices.getByText(rangeTag, { exact: true })).toBeVisible();
  });

  test('E2E-RPT-003 xuất CSV', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/reports');
    await expectReportLoaded(page);

    const exportButton = page.getByRole('button', { name: 'Xuất CSV', exact: true });
    await expect(exportButton).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      exportButton.click(),
    ]);

    expect(download.suggestedFilename()).toMatch(
      /^bao-cao-doanh-thu_\d{8}-\d{8}\.csv$/,
    );

    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    if (!downloadPath) throw new Error('Không tìm thấy file CSV đã tải');

    const buffer = await fs.readFile(downloadPath);
    expect(buffer.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));

    const content = buffer.toString('utf8');
    expect(content).toContain('Tổng doanh thu');
    expect(content).toContain('Lợi nhuận thuần');
    expect(content).toContain('Top dịch vụ');
  });

  test('E2E-RPT-004 lỗi tải báo cáo và thử lại', { tag: '@p2' }, async ({ page }) => {
    await page.route('**/api/v1/reports/revenue**', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      }),
    );

    await page.goto('/reports');

    const errorTitle = page.getByText('Không tải được báo cáo doanh thu');
    await expect(errorTitle).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Vui lòng kiểm tra kết nối và thử lại.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Xuất CSV', exact: true })).toBeDisabled();

    await page.unroute('**/api/v1/reports/revenue**');
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();

    await expect(errorTitle).toHaveCount(0, { timeout: 20_000 });
    await expectReportLoaded(page);
    await expect(page.getByRole('button', { name: 'Xuất CSV', exact: true })).toBeEnabled();
  });
});
