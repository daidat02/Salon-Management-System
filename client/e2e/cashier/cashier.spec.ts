import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import { createOrder, createService, tag } from '../support/data';

type MockOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  subtotal_amount: number;
  discount_amount: number;
  total_amount: number;
  status: 'pending' | 'confirm' | 'delivery' | 'completed' | 'cancelled' | 'refunded';
  created_at: string;
  updated_at: string;
};

function money(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function mockOrder(overrides: Partial<MockOrder> = {}): MockOrder {
  const now = new Date().toISOString();
  return {
    id: 'mock-order',
    code: 'ORD-MOCK',
    customer_id: null,
    subtotal_amount: 100_000,
    discount_amount: 0,
    total_amount: 100_000,
    status: 'pending',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

async function mockCashierList(page: Page, getRows: () => MockOrder[]): Promise<void> {
  await page.route('**/api/v1/orders**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'GET' && url.pathname === '/api/v1/orders') {
      const rows = getRows();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { data: rows, page: 1, page_size: 50, total: rows.length, total_pages: 1 },
        }),
      });
      return;
    }
    await route.continue();
  });
}

async function pickCashierFilter(page: Page, label: string): Promise<void> {
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

function cardOf(page: Page, code: string) {
  return page
    .getByText(code, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"group")]');
}

test.describe('E2E-CSH cashier', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-CSH-001 danh sách đơn cần xử lý và lọc trạng thái', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ CSH-001'), price: 100_000 });
    const pending = await createOrder(api, { service_id: service.id });
    const pendingRow = mockOrder({
      id: pending.id,
      code: pending.code,
      subtotal_amount: pending.total_amount,
      total_amount: pending.total_amount,
      status: 'pending',
    });
    const confirmRow = mockOrder({
      id: 'mock-confirm',
      code: 'ORD-CONFIRM-E2E',
      status: 'confirm',
      total_amount: 250_000,
      subtotal_amount: 250_000,
    });
    const deliveryRow = mockOrder({
      id: 'mock-delivery',
      code: 'ORD-DELIVERY-E2E',
      status: 'delivery',
      total_amount: 320_000,
      subtotal_amount: 320_000,
    });
    await mockCashierList(page, () => [pendingRow, confirmRow, deliveryRow]);

    await page.goto('/cashier');
    await expect(page.getByRole('heading', { level: 1, name: 'Thu ngân' })).toBeVisible();
    await expect(page.getByText('Đơn cần xử lý', { exact: true })).toBeVisible();
    await expect(page.getByText('3 đơn', { exact: true })).toBeVisible();

    const pendingCard = cardOf(page, pending.code);
    await expect(pendingCard).toContainText('Khách lẻ (Walk-in)');
    await expect(pendingCard).toContainText('Chờ xử lý');
    await expect(pendingCard).toContainText(money(pending.total_amount));
    await expect(cardOf(page, confirmRow.code)).toContainText('Đã xác nhận');
    await expect(cardOf(page, deliveryRow.code)).toContainText('Đang giao');

    await pendingCard.getByRole('button', { name: 'Thu tiền ngay' }).click();
    await expect(page).toHaveURL(new RegExp(`/orders/${pending.id}$`));

    await page.goto('/cashier');
    await pickCashierFilter(page, 'Chờ xử lý');
    await expect(cardOf(page, pending.code)).toBeVisible();
    await expect(cardOf(page, confirmRow.code)).toHaveCount(0);

    await pickCashierFilter(page, 'Đã xác nhận');
    await expect(cardOf(page, confirmRow.code)).toBeVisible();
    await expect(cardOf(page, pending.code)).toHaveCount(0);

    await pickCashierFilter(page, 'Đang giao');
    await expect(cardOf(page, deliveryRow.code)).toBeVisible();
    await expect(cardOf(page, confirmRow.code)).toHaveCount(0);
  });

  test('E2E-CSH-002 trạng thái rỗng và CTA tạo đơn', { tag: '@p0' }, async ({ page }) => {
    let rows: MockOrder[] = [mockOrder({ code: 'ORD-EMPTY-E2E' })];
    await mockCashierList(page, () => rows);
    await page.goto('/cashier');

    await expect(cardOf(page, 'ORD-EMPTY-E2E')).toBeVisible();
    await pickCashierFilter(page, 'Đã xác nhận');
    await expect(page.getByText('Không có đơn cần xử lý', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Thử đổi bộ lọc hoặc từ khóa tìm kiếm.', { exact: true }),
    ).toBeVisible();

    rows = [];
    await page.reload();
    await expect(page.getByText('Không có đơn cần xử lý', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Tất cả đơn đã hoàn tất — tạo đơn mới cho khách tại quầy.', {
        exact: true,
      }),
    ).toBeVisible();

    const empty = page.getByText('Không có đơn cần xử lý', { exact: true }).locator('..');
    await empty.getByRole('button', { name: 'Tạo đơn mới' }).click();
    await expect(page).toHaveURL(/\/cashier\/pos$/);
  });
});
