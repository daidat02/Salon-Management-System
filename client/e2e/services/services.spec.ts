import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { createCategory, createProduct, createService, tag } from '../support/data';

function serviceRow(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function searchServices(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder('Tìm theo tên dịch vụ, mã dịch vụ...').fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

async function pickFilter(page: Page, index: number, label: string): Promise<void> {
  await page.locator('[data-slot="select-trigger"]').nth(index).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

async function findServiceByName(api: ApiClient, name: string) {
  const list = await api.get<{ data: { id: string; name: string }[] }>('/services', {
    search: name,
    page: 1,
    page_size: 10,
  });
  return list.data.find((service) => service.name === name);
}

async function openServiceDrawer(page: Page, name: string) {
  await page.goto('/services');
  await searchServices(page, name);
  const row = serviceRow(page, name);
  await expect(row).toBeVisible();
  await row.getByText(name, { exact: true }).click();

  const drawer = page.locator('[data-slot="sheet-content"]');
  await expect(drawer.getByText('Chi tiết dịch vụ', { exact: true })).toBeVisible();
  return drawer;
}

test.describe('E2E-SVC services', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-SVC-001 danh sách và lọc dịch vụ', { tag: '@p1' }, async ({ page, api }) => {
    const category = await createCategory(api, 'service', tag('Danh mục SVC-001'));
    const name = `Dịch vụ ${tag('SVC-001')}`;
    const service = await createService(api, { name, category_id: category.id });

    try {
      await page.goto('/services');
      await expect(page.getByRole('heading', { level: 1, name: 'Dịch vụ' })).toBeVisible();

      for (const label of [
        'Tổng dịch vụ',
        'Đang hoạt động',
        'Tạm ngưng / Ẩn',
        'Doanh thu dịch vụ tháng',
      ]) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }

      for (const header of [
        'Tên dịch vụ & Mô tả',
        'Danh mục',
        'Thời lượng',
        'Đơn giá',
        'Số lượng/Tháng',
        'Doanh thu tháng',
        'Trạng thái',
        'Cập nhật lần cuối',
      ]) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }

      await searchServices(page, name);
      await expect(serviceRow(page, name)).toBeVisible();

      await pickFilter(page, 0, category.name);
      await expect(page).toHaveURL(/[?&]category_id=/);
      await expect(serviceRow(page, name)).toBeVisible();

      await pickFilter(page, 1, 'Đang hoạt động');
      await expect(page).toHaveURL(/[?&]status=active/);
      await expect(serviceRow(page, name)).toBeVisible();

      await pickFilter(page, 2, 'Giá tăng dần');
      await expect(page).toHaveURL(/[?&]sort=price_asc/);
      await expect(serviceRow(page, name)).toBeVisible();

      await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
      await expect(page).toHaveURL(/\/services(\?)?$/);
      expect(new URL(page.url()).pathname).toBe('/services');
      expect(new URL(page.url()).search).toBe('');
      await expect(page.getByPlaceholder('Tìm theo tên dịch vụ, mã dịch vụ...')).toHaveValue('');
    } finally {
      try {
        await api.delete(`/services/${service.id}`);
      } catch {}
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });

  test('E2E-SVC-002 tạo dịch vụ', { tag: '@p0' }, async ({ page, api }) => {
    const category = await createCategory(api, 'service', tag('Danh mục SVC-002'));
    const name = `Dịch vụ ${tag('SVC-002')}`;

    try {
      await page.goto('/services');
      await page.getByRole('button', { name: 'Thêm dịch vụ' }).click();

      const dialog = page.getByRole('dialog', { name: 'Thêm mới dịch vụ', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="name"]').fill(name);
      await dialog.locator('input[name="duration_minutes"]').fill('45');
      await dialog.locator('input[name="price"]').fill('275000');

      await dialog.locator('[data-slot="select-trigger"]').click();
      await page
        .locator('[data-slot="select-item"]')
        .filter({ hasText: category.name })
        .first()
        .click();

      await dialog.getByRole('button', { name: 'Lưu dịch vụ' }).click();
      await expect(page.getByText('Tạo dịch vụ thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await searchServices(page, name);
      const row = serviceRow(page, name);
      await expect(row).toBeVisible();
      await expect(row).toContainText(category.name);
      await expect(row).toContainText('45 phút');
      await expect(row).toContainText('275.000 đ');

      const created = await findServiceByName(api, name);
      expect(created).toBeTruthy();
    } finally {
      try {
        const created = await findServiceByName(api, name);
        if (created) await api.delete(`/services/${created.id}`);
      } catch {}
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });

  test('E2E-SVC-003 định mức vật tư', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Dịch vụ ${tag('SVC-003')}`;
    const service = await createService(api, { name });
    const materialName = `Vật tư ${tag('SVC-003')}`;
    const material = await createProduct(api, {
      name: materialName,
      product_type: 'material',
      stock_quantity: 10,
    });

    try {
      let drawer = await openServiceDrawer(page, name);

      const materialsHeading = drawer.getByText('Định mức vật tư / lần thực hiện', {
        exact: true,
      });
      await expect(materialsHeading).toBeVisible();

      await drawer.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
      await drawer.getByRole('button', { name: 'Mở danh sách' }).click();
      await page.getByText(`${materialName} • ${material.sku}`, { exact: true }).click();

      const qty = drawer.locator('input[data-testid^="service-material-qty-"]');
      await expect(qty).toHaveValue('1');
      await qty.fill('2');
      await drawer.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();

      await expect(page.getByText('Đã lưu định mức vật tư', { exact: true })).toBeVisible();
      await expect(drawer.getByRole('row').filter({ hasText: materialName })).toContainText('2');

      await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
      drawer = await openServiceDrawer(page, name);
      await expect(drawer.getByRole('row').filter({ hasText: materialName })).toContainText('2');

      const detail = await api.get<{
        materials: { product_id: string; quantity: number }[];
      }>(`/services/${service.id}/details`);
      expect(detail.materials).toHaveLength(1);
      expect(detail.materials[0].product_id).toBe(material.id);
      expect(detail.materials[0].quantity).toBe(2);

      await drawer.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
      const invalidQty = drawer.locator('input[data-testid^="service-material-qty-"]');
      await invalidQty.fill('0');
      await drawer.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();

      await expect(page.getByText('Định lượng không hợp lệ', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Định lượng vật tư phải lớn hơn 0.', { exact: true }),
      ).toBeVisible();
      await expect(drawer).toBeVisible();
    } finally {
      try {
        await api.delete(`/services/${service.id}`);
      } catch {}
      try {
        await api.delete(`/products/${material.id}`);
      } catch {}
    }
  });

  test('E2E-SVC-004 validate dịch vụ', { tag: '@p0' }, async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/services'
      ) {
        posts.push(request.url());
      }
    });

    await page.goto('/services');
    await page.getByRole('button', { name: 'Thêm dịch vụ' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm mới dịch vụ', exact: true });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="name"]').fill('   ');
    await dialog.locator('input[name="duration_minutes"]').fill('0');
    await dialog.locator('input[name="price"]').fill('0');
    await dialog.getByRole('button', { name: 'Lưu dịch vụ' }).click();

    await expect(
      dialog.getByText('Vui lòng nhập tên, thời lượng và giá', { exact: true }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(posts).toHaveLength(0);
  });
});
