import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import {
  createCustomer,
  createOrder,
  createService,
  tag,
  uniquePhone,
} from '../support/data';

function rowOf(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

function isoDayThisMonth(day: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

async function searchCustomers(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder('Tìm tên, SĐT, mã KH...').fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

function vnDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso));
}

async function openCustomerDrawer(page: Page, phone: string) {
  await page.goto('/customers');
  await searchCustomers(page, phone);
  const row = rowOf(page, phone);
  await expect(row).toBeVisible();
  await row.getByText(phone).click();

  const drawer = page.locator('[data-slot="sheet-content"]');
  await expect(drawer.getByText('Chi tiết khách hàng', { exact: true })).toBeVisible();
  return drawer;
}

test.describe('E2E-CUS customers', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-CUS-001 danh sách và tìm kiếm khách hàng', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const name = `Khách ${tag('CUS-001')}`;
    const phone = uniquePhone();
    await createCustomer(api, { full_name: name, phone, gender: 'female' });

    await page.goto('/customers');
    await expect(page.getByRole('heading', { level: 1, name: 'Khách hàng' })).toBeVisible();
    await expect(page.getByText(/Không tải được danh sách khách hàng/)).toHaveCount(0);

    for (const header of [
      'Khách hàng',
      'Giới tính',
      'Ngày sinh',
      'Tổng chi tiêu',
      'Lượt ghé',
      'Trạng thái',
      'Ngày tạo',
    ]) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }

    await searchCustomers(page, name);
    const nameRow = rowOf(page, name);
    await expect(nameRow).toBeVisible();
    await expect(nameRow).toContainText(phone);
    await expect(nameRow).toContainText('Hoạt động');

    await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    await expect(page).toHaveURL(/\/customers(\?)?$/);
    expect(new URL(page.url()).pathname).toBe('/customers');
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByPlaceholder('Tìm tên, SĐT, mã KH...')).toHaveValue('');

    await searchCustomers(page, phone);
    await expect(rowOf(page, name)).toBeVisible();
  });

  test('E2E-CUS-002 tạo khách hàng', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Khách mới ${tag('CUS-002')}`;
    const phone = uniquePhone();
    const birthDate = isoDayThisMonth(15);

    try {
      await page.goto('/customers');
      await page.getByRole('button', { name: 'Thêm khách hàng' }).click();

      const dialog = page.getByRole('dialog', { name: 'Thêm mới khách hàng', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="full_name"]').fill(name);
      await dialog.locator('input[name="phone"]').fill(phone);

      const male = dialog.getByRole('button', { name: 'Nam', exact: true });
      await male.click();
      await expect(male).toHaveAttribute('aria-pressed', 'true');

      await dialog.getByRole('button', { name: 'Chọn ngày sinh' }).click();
      await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
      const day = page.locator(`[data-day="${birthDate}"] button`);
      await expect(day).toBeVisible();
      await day.click();

      await dialog.getByRole('button', { name: 'Lưu khách hàng' }).click();
      await expect(page.getByText('Tạo khách hàng thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await searchCustomers(page, phone);
      const row = rowOf(page, name);
      await expect(row).toBeVisible();
      await expect(row).toContainText(phone);
      await expect(row).toContainText('Nam');

      const created = await api.get<{
        id: string;
        full_name: string;
        phone: string;
        gender: string;
        birth_date: string | null;
      }>('/customers/phone', { phone });
      expect(created.full_name).toBe(name);
      expect(created.gender).toBe('male');
      expect(created.birth_date).not.toBeNull();
      expect(vnDate(created.birth_date as string)).toBe(birthDate);
    } finally {
      try {
        const created = await api.get<{ id: string }>('/customers/phone', { phone });
        await api.delete(`/customers/${created.id}`);
      } catch {}
    }
  });

  test('E2E-CUS-003 sửa hồ sơ khách hàng', { tag: '@p0' }, async ({ page, api }) => {
    const oldName = `Khách cũ ${tag('CUS-003')}`;
    const newName = `Khách mới ${tag('CUS-003')}`;
    const newNote = `Ghi chú đã sửa ${tag('CUS-003-note')}`;
    const phone = uniquePhone();
    await createCustomer(api, { full_name: oldName, phone, note: 'Ghi chú ban đầu' });

    try {
      const drawer = await openCustomerDrawer(page, phone);
      await drawer.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }).click();

      const dialog = page.getByRole('dialog', { name: 'Cập nhật khách hàng', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="full_name"]').fill(newName);
      await dialog.locator('textarea[name="note"]').fill(newNote);
      await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();

      await expect(page.getByText('Cập nhật khách hàng thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect(drawer.getByText(newName, { exact: true })).toBeVisible();
      await expect(drawer.getByText(newNote)).toBeVisible();

      await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
      await expect(rowOf(page, newName)).toBeVisible();

      const updated = await api.get<{ full_name: string; note: string }>('/customers/phone', {
        phone,
      });
      expect(updated.full_name).toBe(newName);
      expect(updated.note).toBe(newNote);
    } finally {
      try {
        const created = await api.get<{ id: string }>('/customers/phone', { phone });
        await api.delete(`/customers/${created.id}`);
      } catch {}
    }
  });

  test('E2E-CUS-004 validate tạo khách hàng', { tag: '@p0' }, async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/customers'
      ) {
        posts.push(request.url());
      }
    });

    await page.goto('/customers');
    await page.getByRole('button', { name: 'Thêm khách hàng' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm mới khách hàng', exact: true });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="full_name"]').fill('   ');
    await dialog.locator('input[name="phone"]').fill('   ');
    await dialog.getByRole('button', { name: 'Lưu khách hàng' }).click();

    await expect(
      dialog.getByText('Vui lòng nhập họ tên và số điện thoại', { exact: true }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(posts).toHaveLength(0);
  });

  test('E2E-CUS-004 trường UI-only không chặn submit', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Khách UI-only ${tag('CUS-004')}`;
    const phone = uniquePhone();

    try {
      await page.goto('/customers');
      await page.getByRole('button', { name: 'Thêm khách hàng' }).click();
      const dialog = page.getByRole('dialog', { name: 'Thêm mới khách hàng', exact: true });
      await dialog.locator('input[name="full_name"]').fill(name);
      await dialog.locator('input[name="phone"]').fill(phone);

      await expect(dialog.locator('input[name="email"]')).toHaveValue('');
      await expect(dialog.locator('input[name="address"]')).toHaveValue('');
      await dialog.getByRole('button', { name: 'Lưu khách hàng' }).click();

      await expect(page.getByText('Tạo khách hàng thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const created = await api.get<{ full_name: string }>('/customers/phone', { phone });
      expect(created.full_name).toBe(name);
    } finally {
      try {
        const created = await api.get<{ id: string }>('/customers/phone', { phone });
        await api.delete(`/customers/${created.id}`);
      } catch {}
    }
  });

  test('E2E-CUS-005 drawer hồ sơ khách hàng', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Khách drawer ${tag('CUS-005')}`;
    const phone = uniquePhone();
    const customer = await createCustomer(api, { full_name: name, phone, note: 'Ghi chú E2E' });
    const service = await createService(api);
    const order = await createOrder(api, {
      service_id: service.id,
      customer_id: customer.id,
    });

    try {
      const drawer = await openCustomerDrawer(page, phone);
      await expect(drawer.getByText(name, { exact: true })).toBeVisible();

      for (const label of ['Lần ghé', 'Tổng chi', 'Tích điểm', 'Hủy lịch']) {
        await expect(drawer.getByText(label, { exact: true })).toBeVisible();
      }

      await expect(
        drawer.getByText('Lịch sử đơn hàng gần đây', { exact: true }),
      ).toBeVisible();
      await expect(drawer.getByText(order.code, { exact: true })).toBeVisible();

      const upcoming = drawer.getByText('Lịch hẹn sắp tới', { exact: true });
      await expect(upcoming).toBeVisible();
      await expect(drawer.getByText(/mock tạm/)).toBeVisible();
    } finally {
      try {
        await api.delete(`/orders/${order.id}`);
      } catch {}
      try {
        await api.delete(`/customers/${customer.id}`);
      } catch {}
      try {
        await api.delete(`/services/${service.id}`);
      } catch {}
    }
  });
});
