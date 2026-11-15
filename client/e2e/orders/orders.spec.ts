import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import {
  createCustomer,
  createOrder,
  createProduct,
  createService,
  createStaff,
  tag,
} from '../support/data';

type OrderSummary = { id: string; code: string; total_amount: number };

type OrderDetailPayload = {
  order: { id: string; code: string; status: string; total_amount: number };
  items: {
    id: string;
    item_type: 'service' | 'product';
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  payments: { id: string; status: string; amount: number }[];
};

type PaymentSettings = {
  payment_methods: { id: string; code: string; name: string; is_active: boolean }[];
};

function money(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

async function getDetail(api: ApiClient, orderId: string): Promise<OrderDetailPayload> {
  return api.get<OrderDetailPayload>(`/orders/${orderId}`);
}

async function getStock(api: ApiClient, productId: string): Promise<number> {
  const product = await api.get<{ stock_quantity: number }>(`/products/${productId}`);
  return product.stock_quantity;
}

async function getCashMethodId(api: ApiClient): Promise<string> {
  const settings = await api.get<PaymentSettings>('/settings/payment');
  const method =
    settings.payment_methods.find((m) => m.is_active && m.code.toUpperCase() === 'CASH') ??
    settings.payment_methods.find((m) => m.is_active);
  if (!method) throw new Error('[e2e] Không có phương thức thanh toán đang bật');
  return method.id;
}

async function completeOrder(api: ApiClient, orderId: string): Promise<void> {
  const methodPaymentId = await getCashMethodId(api);
  const init = await api.post<{ payment: { id: string } }>(
    `/orders/${orderId}/payments/init`,
  );
  await api.post(`/orders/${orderId}/payments/${init.payment.id}/confirm`, {
    method: 'cash',
    method_payment_id: methodPaymentId,
    provider: null,
    provider_txn_id: null,
    discount_amount: 0,
  });
}

async function cancelOrder(api: ApiClient, orderId: string): Promise<void> {
  await api.post(`/orders/${orderId}/cancel`);
}

async function refundOrder(api: ApiClient, orderId: string): Promise<void> {
  await api.post(`/orders/${orderId}/refund`);
}

async function openDetail(page: Page, order: OrderSummary): Promise<void> {
  await page.goto(`/orders/${order.id}`);
  await expect(
    page.getByRole('heading', { level: 1, name: `Chi tiết đơn hàng ${order.code}` }),
  ).toBeVisible();
  await expect(page.getByText(/Không tải được chi tiết đơn hàng/)).toHaveCount(0);
}

function itemRow(page: Page, itemId: string): Locator {
  return page.locator(`[data-testid="order-edit-qty-${itemId}"]`).locator('xpath=ancestor::tr');
}

function listRow(page: Page, code: string): Locator {
  return page.getByRole('row').filter({ hasText: code });
}

async function pickHistoryFilter(page: Page, label: string): Promise<void> {
  await page.locator('[data-slot="select-trigger"]').first().click();
  await page
    .locator('[data-slot="select-item"]')
    .filter({ hasText: label })
    .first()
    .click();
}

test.describe('E2E-ORD orders', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-ORD-001 danh sách lịch sử, lọc và tìm mã đơn', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ ORD-001'), price: 120_000 });
    const completed = await createOrder(api, { service_id: service.id });
    await completeOrder(api, completed.id);
    const cancelled = await createOrder(api, { service_id: service.id });
    await cancelOrder(api, cancelled.id);
    const refunded = await createOrder(api, { service_id: service.id });
    await completeOrder(api, refunded.id);
    await refundOrder(api, refunded.id);

    await page.goto('/orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Đơn hàng' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lịch sử Đơn Hàng' })).toBeVisible();

    await pickHistoryFilter(page, 'Hoàn tất');
    await expect(page).toHaveURL(/[?&]status=completed/);
    await expect(listRow(page, completed.code)).toBeVisible();
    await expect(listRow(page, cancelled.code)).toHaveCount(0);

    await pickHistoryFilter(page, 'Đã hủy');
    await expect(page).toHaveURL(/[?&]status=cancelled/);
    await expect(listRow(page, cancelled.code)).toBeVisible();
    await expect(listRow(page, completed.code)).toHaveCount(0);

    await pickHistoryFilter(page, 'Đã hoàn tiền');
    await expect(page).toHaveURL(/[?&]status=refunded/);
    await expect(listRow(page, refunded.code)).toBeVisible();
    await expect(listRow(page, completed.code)).toHaveCount(0);

    await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    await expect(page).toHaveURL(/\/orders(\?)?$/);
    expect(new URL(page.url()).pathname).toBe('/orders');
    expect(new URL(page.url()).search).toBe('');

    const search = page.getByPlaceholder('Tìm mã đơn, tên khách, SĐT...');
    await search.fill(completed.code);
    await expect(page).toHaveURL(new RegExp(`[?&]search=${encodeURIComponent(completed.code)}`));
    await expect(listRow(page, completed.code)).toBeVisible();
    await expect(listRow(page, cancelled.code)).toHaveCount(0);
  });

  test('E2E-ORD-002 chi tiết đơn hiển thị đúng dữ liệu', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ ORD-002'), price: 180_000 });
    const order = await createOrder(api, {
      service_id: service.id,
      customer_id: customer.id as string,
    });

    await page.goto('/orders');
    await page.goto(`/orders/${order.id}`);
    await expect(page).toHaveURL(new RegExp(`/orders/${order.id}$`));

    await expect(
      page.getByRole('heading', { level: 1, name: `Chi tiết đơn hàng ${order.code}` }),
    ).toBeVisible();
    await expect(page.getByText('Chờ xử lý', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Thời gian tạo đơn:/)).toBeVisible();

    const detail = await getDetail(api, order.id);
    const row = itemRow(page, detail.items[0].id);
    await expect(row).toContainText(service.name as string);
    await expect(row).toContainText(money(detail.order.total_amount));

    await expect(page.getByRole('heading', { name: 'Thông tin khách hàng' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Thông tin Thanh toán & Chứng từ' }),
    ).toBeVisible();
    await expect(page.getByText(customer.full_name as string, { exact: true })).toBeVisible();
    await expect(page.getByText(customer.phone as string, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Quay lại danh sách đơn' }).click();
    await expect(page).toHaveURL(/\/orders$/);
  });

  test('E2E-ORD-003 hủy đơn pending và nhả giữ chỗ kho', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const product = await createProduct(api, {
      name: tag('SP ORD-003'),
      product_type: 'retail',
      net_unit: 'ml',
      net_amount: 1,
      unit: 'chai',
      stock_quantity: 100,
      sell_price: 80_000,
    });
    const service = await createService(api, { name: tag('Dịch vụ ORD-003') });
    const order = await createOrder(
      api,
      { service_id: service.id },
      {
        items: [
          {
            item_type: 'product',
            service_id: null,
            product_id: product.id,
            staff_id: null,
            quantity: 2,
            materials: [],
          },
        ],
      },
    );

    const stockBefore = await getStock(api, product.id);
    expect(stockBefore).toBe(100);

    await openDetail(page, order);
    await page.getByRole('button', { name: 'Hủy đơn' }).click();

    const dialog = page.getByRole('dialog', { name: 'Hủy đơn hàng?', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Hủy đơn', exact: true }).click();

    await expect(page.getByText('Đã hủy đơn hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Đã hủy', { exact: true }).first()).toBeVisible();

    const detail = await getDetail(api, order.id);
    expect(detail.order.status).toBe('cancelled');
    await expect(page.getByRole('button', { name: 'Hủy đơn' })).toHaveCount(0);

    const stockAfter = await getStock(api, product.id);
    expect(stockAfter).toBe(stockBefore);
  });

  test('E2E-ORD-004 hoàn đơn completed và cộng lại kho', async ({ page, api, pageAs }) => {
    const product = await createProduct(api, {
      name: tag('SP ORD-004'),
      product_type: 'retail',
      net_unit: 'ml',
      net_amount: 1,
      unit: 'chai',
      stock_quantity: 100,
      sell_price: 80_000,
    });
    const service = await createService(api, { name: tag('Dịch vụ ORD-004') });
    const order = await createOrder(
      api,
      { service_id: service.id },
      {
        items: [
          {
            item_type: 'product',
            service_id: null,
            product_id: product.id,
            staff_id: null,
            quantity: 2,
            materials: [],
          },
        ],
      },
    );

    const stockBefore = await getStock(api, product.id);
    await completeOrder(api, order.id);
    expect(await getStock(api, product.id)).toBe(stockBefore - 2);

    await openDetail(page, order);
    await page.getByRole('button', { name: 'Hoàn đơn' }).click();

    const dialog = page.getByRole('dialog', { name: 'Hoàn đơn hàng?', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Hoàn đơn', exact: true }).click();

    await expect(page.getByText('Đã hoàn đơn hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Đã hoàn tiền', { exact: true }).first()).toBeVisible();

    const detail = await getDetail(api, order.id);
    expect(detail.order.status).toBe('refunded');
    expect(await getStock(api, product.id)).toBe(stockBefore);

    const managerOrder = await createOrder(api, { service_id: service.id });
    await completeOrder(api, managerOrder.id);
    const managerPage = await pageAs('manager');
    await injectAccessToken(managerPage, 'manager');
    await managerPage.goto(`/orders/${managerOrder.id}`);
    await expect(
      managerPage.getByRole('heading', {
        level: 1,
        name: `Chi tiết đơn hàng ${managerOrder.code}`,
      }),
    ).toBeVisible();
    await expect(managerPage.getByRole('button', { name: 'In hóa đơn' })).toBeVisible();
    await expect(managerPage.getByRole('button', { name: 'Hoàn đơn' })).toHaveCount(0);
  });

  test('E2E-ORD-005 sửa số lượng dòng hàng', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ ORD-005'), price: 150_000 });
    const order = await createOrder(api, { service_id: service.id });
    const detail = await getDetail(api, order.id);
    const itemId = detail.items[0].id;

    await openDetail(page, order);
    await expect(itemRow(page, itemId)).toContainText(money(150_000));

    await page.locator(`[data-testid="order-edit-qty-${itemId}"]`).click();
    const input = page.locator(`[data-testid="order-qty-${itemId}-input"]`);
    await input.fill('3');
    await page.locator(`[data-testid="order-qty-${itemId}-confirm"]`).click();

    await expect(page.getByText('Đã đổi số lượng', { exact: true })).toBeVisible();
    const row = itemRow(page, itemId);
    await expect(row).toContainText('x3');
    await expect(row).toContainText(money(450_000));

    await page.reload();
    await expect(itemRow(page, itemId)).toContainText('x3');
    await expect(itemRow(page, itemId)).toContainText(money(450_000));

    await page.locator(`[data-testid="order-edit-qty-${itemId}"]`).click();
    await page.locator(`[data-testid="order-qty-${itemId}-input"]`).fill('0');
    await page.locator(`[data-testid="order-qty-${itemId}-confirm"]`).click();
    await expect(page.locator(`[data-testid="order-qty-${itemId}-input"]`)).toBeVisible();
    expect((await getDetail(api, order.id)).items[0].quantity).toBe(3);
    await page.locator(`[data-testid="order-qty-${itemId}-cancel"]`).click();
  });

  test('E2E-ORD-006 xóa dòng hàng và chặn xóa dòng cuối', { tag: '@p0' }, async ({ page, api }) => {
    const serviceA = await createService(api, { name: tag('Dịch vụ ORD-006 A'), price: 100_000 });
    const serviceB = await createService(api, { name: tag('Dịch vụ ORD-006 B'), price: 200_000 });
    const order = await createOrder(
      api,
      { service_id: serviceA.id },
      {
        items: [
          {
            item_type: 'service',
            service_id: serviceA.id,
            product_id: null,
            staff_id: null,
            quantity: 1,
            materials: [],
          },
          {
            item_type: 'service',
            service_id: serviceB.id,
            product_id: null,
            staff_id: null,
            quantity: 1,
            materials: [],
          },
        ],
      },
    );
    const detail = await getDetail(api, order.id);
    const second = detail.items.find((item) => item.line_total === 200_000);
    const first = detail.items.find((item) => item.line_total === 100_000);
    if (!first || !second) throw new Error('[e2e] Thiếu dòng hàng fixture');

    await openDetail(page, order);
    await page.locator(`[data-testid="order-delete-line-${second.id}"]`).click();

    const dialog = page.getByRole('dialog', { name: 'Xóa dòng hàng?', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Xóa dòng', exact: true }).click();

    await expect(page.getByText('Đã xóa dòng hàng', { exact: true })).toBeVisible();
    await expect(page.locator(`[data-testid="order-edit-qty-${second.id}"]`)).toHaveCount(0);
    await expect(itemRow(page, first.id)).toContainText(money(100_000));

    await page.locator(`[data-testid="order-delete-line-${first.id}"]`).click();
    const lastDialog = page.getByRole('dialog', { name: 'Xóa dòng hàng?', exact: true });
    await lastDialog.getByRole('button', { name: 'Xóa dòng', exact: true }).click();
    await expect(lastDialog).toBeVisible();
    await expect(itemRow(page, first.id)).toBeVisible();
    expect((await getDetail(api, order.id)).items).toHaveLength(1);

    await lastDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(lastDialog).toBeHidden();
  });

  test('E2E-ORD-007 cập nhật nhân viên thực hiện', { tag: '@p0' }, async ({ page, api }) => {
    const staff = await createStaff(api, { full_name: tag('NV ORD-007') });
    const service = await createService(api, { name: tag('Dịch vụ ORD-007'), price: 150_000 });
    const order = await createOrder(api, { service_id: service.id });
    const detail = await getDetail(api, order.id);
    const itemId = detail.items[0].id;

    await openDetail(page, order);
    await page.locator(`[data-testid="order-edit-staff-${itemId}"]`).click();

    const dialog = page.getByRole('dialog', {
      name: `Cập nhật nhân viên — ${service.name}`,
    });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Thêm nhân viên' }).click();
    await dialog.locator('[data-slot="select-trigger"]').first().click();
    await page
      .locator('[data-slot="select-item"]')
      .filter({ hasText: staff.full_name })
      .first()
      .click();
    await dialog.getByRole('spinbutton').fill('100');
    await dialog.getByRole('button', { name: 'Áp dụng' }).click();

    await expect(page.getByText('Đã lưu nhân viên thực hiện', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(itemRow(page, itemId)).toContainText(staff.full_name);

    await page.reload();
    await expect(itemRow(page, itemId)).toContainText(staff.full_name);
  });

  test('E2E-ORD-008 gắn khách hàng vào đơn chưa có khách', { tag: '@p0' }, async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ ORD-008') });
    const order = await createOrder(
      api,
      { service_id: service.id },
      { customer_id: null, new_customer: null },
    );

    await openDetail(page, order);
    await expect(page.getByText('Khách lẻ', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Tìm / thêm khách' }).click();
    await page.getByPlaceholder('Nhập SĐT...').fill(customer.phone as string);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();

    await expect(
      page.getByText(`Đã gắn khách ${customer.full_name} vào đơn`, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(customer.full_name as string, { exact: true })).toBeVisible();
    await expect(page.getByText(customer.phone as string, { exact: true })).toBeVisible();
    await expect(page.getByText('Số lần ghé', { exact: true })).toBeVisible();
    await expect(page.getByText('Điểm thưởng', { exact: true })).toBeVisible();

    const detail = await getDetail(api, order.id);
    expect(detail.order.status).toBe('pending');
  });

  test('E2E-ORD-009 thu tiền và chốt đơn', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ ORD-009'), price: 150_000 });
    const order = await createOrder(api, { service_id: service.id });

    await openDetail(page, order);
    const collect = page.getByTestId('order-collect-payment');
    await expect(collect).toContainText(money(150_000));
    await collect.click();

    const dialog = page.getByRole('dialog', { name: `Thu tiền đơn ${order.code}`, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Tiền mặt' }).click();
    await dialog.getByRole('button', { name: /Xác nhận thu/ }).click();

    await expect(page.getByText('Thu tiền thành công', { exact: true })).toBeVisible();
    await expect(page.getByText('Hoàn tất', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('order-collect-payment')).toHaveCount(0);

    await expect(page.getByText('Đã thu:', { exact: true }).locator('..')).toContainText(
      money(150_000),
    );
    await expect(page.getByText('Còn thiếu:', { exact: true }).locator('..')).toContainText(
      money(0),
    );

    const detail = await getDetail(api, order.id);
    expect(detail.order.status).toBe('completed');
  });

  test('E2E-ORD-010 giảm giá vượt số còn thiếu bị chặn', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ ORD-010'), price: 200_000 });
    const order = await createOrder(api, { service_id: service.id });

    await openDetail(page, order);
    await page.getByTestId('order-collect-payment').click();

    const dialog = page.getByRole('dialog', { name: `Thu tiền đơn ${order.code}`, exact: true });
    await expect(dialog).toBeVisible();

    const over = order.total_amount + 100_000;
    await dialog.locator('input[type="number"]').fill(String(over));

    await expect(dialog.getByText('Số tiền thu', { exact: true }).locator('..')).toContainText(
      money(0),
    );
    await expect(
      dialog.getByText(`Giảm ${money(order.total_amount)} và chốt đơn với tổng mới ${money(0)}.`),
    ).toBeVisible();

    const init = await api.post<{ payment: { id: string } }>(
      `/orders/${order.id}/payments/init`,
    );
    const methodPaymentId = await getCashMethodId(api);
    const response = await api.request.post(
      `orders/${order.id}/payments/${init.payment.id}/confirm`,
      {
        data: {
          method: 'cash',
          method_payment_id: methodPaymentId,
          provider: null,
          provider_txn_id: null,
          discount_amount: over,
        },
      },
    );
    expect(response.status()).toBe(400);
    expect(await response.text()).toContain('Giảm giá vượt quá số tiền còn thiếu');

    expect((await getDetail(api, order.id)).order.status).toBe('pending');
  });
});
