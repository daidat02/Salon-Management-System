import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import {
  createAppointment,
  createCustomer,
  createOrder,
  createProduct,
  createService,
  tag,
  uniquePhone,
} from '../support/data';

type CreatedOrder = {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_reused: boolean;
  appointment_id: string | null;
  total_amount: number;
};

type OrderDetailPayload = {
  order: { id: string; total_amount: number };
  items: { id: string }[];
};

function money(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function isoAt(daysFromNow: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+07:00`;
}

function summary(page: Page) {
  return page.getByText(/^Tạm tính \(/).locator('..');
}

async function addCatalogItem(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder(/Tìm tên dịch vụ/).fill(name);
  const card = page.getByRole('heading', { level: 3, name, exact: true });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.getByRole('heading', { level: 4, name, exact: true })).toBeVisible();
}

async function submitPosOrder(page: Page): Promise<CreatedOrder> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        new URL(res.url()).pathname === '/api/v1/orders',
    ),
    page.getByRole('main').getByRole('button', { name: 'Tạo đơn', exact: true }).click(),
  ]);
  const body = (await response.json()) as { data: CreatedOrder };
  return body.data;
}

async function openPos(page: Page, query = ''): Promise<void> {
  await page.goto(`/cashier/pos${query}`);
  await expect(page.getByText('Thu ngân & Bán hàng', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder(/Tìm tên dịch vụ/)).toBeVisible();
}

test.describe('E2E-POS bán hàng', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-POS-001 tạo đơn mới từ dịch vụ và sản phẩm', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ POS-001'), price: 150_000 });
    const productName = tag('SP POS-001');
    await createProduct(api, {
      name: productName,
      product_type: 'retail',
      unit: 'chai',
      net_unit: 'ml',
      net_amount: 1,
      stock_quantity: 50,
      sell_price: 80_000,
    });
    const total = 230_000;

    await openPos(page);
    await addCatalogItem(page, service.name);
    await addCatalogItem(page, productName);
    await expect(summary(page)).toContainText('Tạm tính (2 mục)');
    await expect(summary(page)).toContainText(money(total));

    const order = await submitPosOrder(page);
    await expect(page.getByText('Tạo đơn thành công', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/cashier$/);
    expect(order.total_amount).toBe(total);

    await page.getByPlaceholder('Tìm mã đơn, tên khách, SĐT...').fill(order.code);
    const card = page
      .getByText(order.code, { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"group")]');
    await expect(card).toBeVisible();
    await expect(card).toContainText(money(total));
  });

  test('E2E-POS-002 tạo khách mới ngay trong POS', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ POS-002'), price: 120_000 });
    const phone = uniquePhone();
    const name = `Khách POS mới ${tag('POS-002')}`;

    try {
      await openPos(page);
      await page.getByRole('button', { name: '+ Thêm khách hàng' }).click();
      await page.getByRole('button', { name: '+ Thêm khách mới', exact: true }).click();
      await page.getByPlaceholder('Nhập SĐT...').fill(phone);
      await page.getByPlaceholder('Tên khách mới...').fill(name);
      await expect(page.getByRole('button').filter({ hasText: name })).toBeVisible();

      await addCatalogItem(page, service.name);
      const order = await submitPosOrder(page);

      await expect(page.getByText('Tạo đơn thành công', { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/cashier$/);
      expect(order.customer_name).toBe(name);

      const customer = await api.get<{ id: string; full_name: string }>('/customers/phone', {
        phone,
      });
      expect(order.customer_id).toBe(customer.id);
      expect(customer.full_name).toBe(name);
    } finally {
      try {
        const customer = await api.get<{ id: string }>('/customers/phone', { phone });
        await api.delete(`/customers/${customer.id}`);
      } catch {}
    }
  });

  test('E2E-POS-003 gắn khách cũ trong POS', { tag: '@p0' }, async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ POS-003'), price: 130_000 });

    await openPos(page);
    await page.getByRole('button', { name: '+ Thêm khách hàng' }).click();
    await page.getByPlaceholder('Nhập SĐT...').fill(customer.phone as string);
    await page.getByRole('button', { name: 'Tìm', exact: true }).click();

    const customerButton = page
      .getByRole('button')
      .filter({ hasText: customer.full_name as string });
    await expect(customerButton).toBeVisible();
    await expect(customerButton).toContainText(customer.phone as string);

    await addCatalogItem(page, service.name);
    const order = await submitPosOrder(page);

    await expect(page.getByText('Tạo đơn thành công', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/cashier$/);
    expect(order.customer_id).toBe(customer.id);

    const list = await api.get<{ total: number; data: { id: string }[] }>('/customers', {
      page: 1,
      page_size: 10,
      search: customer.phone as string,
    });
    expect(list.total).toBe(1);
    expect(list.data[0].id).toBe(customer.id);
  });

  test('E2E-POS-004 sửa giỏ hàng', { tag: '@p0' }, async ({ page, api }) => {
    const serviceA = await createService(api, { name: tag('Dịch vụ POS-004 A'), price: 100_000 });
    const serviceB = await createService(api, { name: tag('Dịch vụ POS-004 B'), price: 200_000 });
    let createCalls = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/orders'
      ) {
        createCalls += 1;
      }
    });

    await openPos(page);
    await addCatalogItem(page, serviceA.name);
    await addCatalogItem(page, serviceB.name);
    await expect(summary(page)).toContainText('Tạm tính (2 mục)');
    await expect(summary(page)).toContainText(money(300_000));

    await page.getByTestId(`pos-cart-increase-${serviceA.id}`).click();
    await expect(summary(page)).toContainText(money(400_000));

    await page.getByTestId(`pos-cart-decrease-${serviceA.id}`).click();
    await page.getByTestId(`pos-cart-decrease-${serviceA.id}`).click();
    await page.getByTestId(`pos-cart-decrease-${serviceA.id}`).click();
    await expect(summary(page)).toContainText(money(300_000));

    await page.getByTestId(`pos-cart-remove-${serviceB.id}`).click();
    await expect(summary(page)).toContainText('Tạm tính (1 mục)');
    await expect(summary(page)).toContainText(money(100_000));

    await page.getByTestId('pos-cart-clear').click();
    await expect(page.getByText('Chưa có sản phẩm — chọn bên trái để thêm')).toBeVisible();
    await expect(summary(page)).toContainText('Tạm tính (0 mục)');
    await expect(summary(page)).toContainText(money(0));
    expect(createCalls).toBe(0);
  });

  test('E2E-POS-005 tạo đơn từ lịch hẹn', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ POS-005'), price: 150_000 });
    const appointment = await createAppointment(api, { service_id: service.id });

    await openPos(page, `?appointmentId=${appointment.id}`);
    await expect(
      page.getByText(`Tạo đơn từ lịch hẹn ${appointment.code}`),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: service.name, exact: true })).toBeVisible();
    await expect(summary(page)).toContainText('Tạm tính (1 mục)');
    await expect(summary(page)).toContainText(money(150_000));

    const order = await submitPosOrder(page);
    await expect(page.getByText('Tạo đơn thành công', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/cashier$/);
    expect(order.appointment_id).toBe(appointment.id);

    const detail = await api.get<{ appointment: { status: string } }>(
      `/appointments/${appointment.id}`,
    );
    expect(detail.appointment.status).toBe('in_progress');
  });

  test('E2E-POS-006 chế độ thêm món vào đơn hiện có', { tag: '@p1' }, async ({ page, api }) => {
    const existingService = await createService(api, {
      name: tag('Dịch vụ POS-006A'),
      price: 100_000,
    });
    const addedService = await createService(api, {
      name: tag('Dịch vụ POS-006B'),
      price: 120_000,
    });
    const order = await createOrder(api, { service_id: existingService.id });

    try {
      await openPos(page, `?orderId=${order.id}`);
      await expect(page.getByText(`Đơn ${order.code}`, { exact: true })).toBeVisible();
      await expect(page.getByText('Thêm món', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Thêm vào đơn', exact: true }),
      ).toBeVisible();
      await expect(summary(page)).toContainText('Tạm tính (0 mục)');

      await addCatalogItem(page, addedService.name);
      await expect(summary(page)).toContainText('Tạm tính (1 mục)');
      await expect(summary(page)).toContainText(money(120_000));

      const [response] = await Promise.all([
        page.waitForResponse(
          (res) =>
            res.request().method() === 'POST' &&
            new URL(res.url()).pathname === `/api/v1/orders/${order.id}/items`,
        ),
        page.getByRole('button', { name: 'Thêm vào đơn', exact: true }).click(),
      ]);
      expect(response.ok()).toBeTruthy();
      await expect(page.getByText('Đã thêm món vào đơn', { exact: false })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/orders/${order.id}$`));

      const detail = await api.get<OrderDetailPayload>(`/orders/${order.id}`);
      expect(detail.items).toHaveLength(2);
      expect(detail.order.total_amount).toBe(220_000);
    } finally {
      try {
        await api.post(`/orders/${order.id}/cancel`);
      } catch {}
      try {
        await api.delete(`/orders/${order.id}`);
      } catch {}
    }
  });

  test('E2E-POS-005 lịch hẹn terminal bị khóa tạo đơn', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ POS-005B'), price: 150_000 });
    const appointment = await createAppointment(
      api,
      { service_id: service.id },
      {
        status: 'cancelled',
      },
    );
    let createCalls = 0;
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/orders'
      ) {
        createCalls += 1;
      }
    });

    await openPos(page, `?appointmentId=${appointment.id}`);
    await expect(
      page.getByText(`Tạo đơn từ lịch hẹn ${appointment.code}`),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: service.name, exact: true })).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Tạo đơn', exact: true }).first().click();
    await expect(
      page.getByRole('main').getByText(`Lịch hẹn ${appointment.code} không thể tạo đơn.`, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/cashier\/pos\?appointmentId=/);
    expect(createCalls).toBe(0);
  });
});
