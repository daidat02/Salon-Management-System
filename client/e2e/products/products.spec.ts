import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { createCategory, createProduct, tag } from '../support/data';

function productRow(page: Page, text: string) {
  return page.getByRole('row').filter({ hasText: text });
}

async function searchProducts(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder('Tìm theo tên sản phẩm, mã SKU...').fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

async function pickFilter(page: Page, index: number, label: string): Promise<void> {
  await page.locator('[data-slot="select-trigger"]').nth(index).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

async function findProductBySku(api: ApiClient, sku: string) {
  const list = await api.get<{ data: { id: string; sku: string }[] }>('/products', {
    search: sku,
    page: 1,
    page_size: 10,
  });
  return list.data.find((product) => product.sku === sku);
}

test.describe('E2E-PRD products', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-PRD-001 danh sách và lọc sản phẩm', { tag: '@p1' }, async ({ page, api }) => {
    const category = await createCategory(api, 'product', tag('Danh mục PRD-001'));
    const sku = tag('SKU-PRD-001');
    const product = await createProduct(api, {
      sku,
      name: `Sản phẩm ${tag('PRD-001')}`,
      category_id: category.id,
      product_type: 'retail',
    });

    try {
      await page.goto('/products');
      await expect(page.getByRole('heading', { level: 1, name: 'Sản phẩm' })).toBeVisible();

      for (const label of [
        'Tổng sản phẩm',
        'Đang bán',
        'Sắp hết hàng',
        'Doanh thu bán lẻ tháng',
      ]) {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
      }

      for (const header of [
        'Mã SKU',
        'Tên sản phẩm',
        'Danh mục',
        'Loại sản phẩm',
        'Đơn giá nhập',
        'Đơn giá bán',
        'Doanh thu tháng',
        'Tồn kho',
        'Trạng thái',
        'Cập nhật lần cuối',
      ]) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }

      await searchProducts(page, sku);
      await expect(productRow(page, sku)).toBeVisible();

      await pickFilter(page, 0, category.name);
      await expect(page).toHaveURL(/[?&]search=/);
      await expect(page).toHaveURL(/[?&]category_id=/);
      await expect(productRow(page, sku)).toBeVisible();

      await pickFilter(page, 1, 'Đang bán');
      await expect(page).toHaveURL(/[?&]status=active/);
      await expect(productRow(page, sku)).toBeVisible();

      await pickFilter(page, 2, 'Giá tăng dần');
      await expect(page).toHaveURL(/[?&]sort=price_asc/);
      await expect(productRow(page, sku)).toBeVisible();

      await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
      await expect(page).toHaveURL(/\/products(\?)?$/);
      expect(new URL(page.url()).pathname).toBe('/products');
      expect(new URL(page.url()).search).toBe('');
      await expect(page.getByPlaceholder('Tìm theo tên sản phẩm, mã SKU...')).toHaveValue('');
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });

  test('E2E-PRD-002 tạo sản phẩm', { tag: '@p0' }, async ({ page, api }) => {
    const sku = tag('SKU-PRD-002');
    const name = `Sản phẩm ${tag('PRD-002')}`;

    try {
      await page.goto('/products');
      await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();

      const dialog = page.getByRole('dialog', { name: 'Thêm mới sản phẩm', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="sku"]').fill(sku);
      await dialog.locator('input[name="name"]').fill(name);
      await dialog.locator('input[name="unit"]').fill('chai');
      await dialog.locator('input[name="sell_price"]').fill('125000');
      await dialog.locator('input[name="stock_quantity"]').fill('50');

      await dialog.getByRole('button', { name: 'Lưu sản phẩm' }).click();
      await expect(page.getByText('Tạo sản phẩm thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await searchProducts(page, sku);
      const row = productRow(page, sku);
      await expect(row).toBeVisible();
      await expect(row).toContainText(name);
      await expect(row).toContainText('125.000 đ');
      await expect(row).toContainText('50 chai');

      const created = await findProductBySku(api, sku);
      expect(created).toBeTruthy();
    } finally {
      try {
        const created = await findProductBySku(api, sku);
        if (created) await api.delete(`/products/${created.id}`);
      } catch {}
    }
  });

  test('E2E-PRD-003 sửa sản phẩm', { tag: '@p0' }, async ({ page, api }) => {
    const sku = tag('SKU-PRD-003');
    const product = await createProduct(api, {
      sku,
      name: `Sản phẩm ${tag('PRD-003')}`,
      sell_price: 150_000,
      min_stock: 5,
    });
    const newPrice = 175_000;
    const newMinStock = 12;

    try {
      await page.goto('/products');
      await searchProducts(page, sku);
      const row = productRow(page, sku);
      await expect(row).toBeVisible();
      await row.getByText(sku, { exact: true }).click();

      const drawer = page.locator('[data-slot="sheet-content"]');
      await expect(drawer.getByText('Chi tiết sản phẩm', { exact: true })).toBeVisible();
      await drawer.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();

      const dialog = page.getByRole('dialog', { name: 'Cập nhật sản phẩm', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="sell_price"]').fill(String(newPrice));
      await dialog.locator('input[name="min_stock"]').fill(String(newMinStock));
      await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();

      await expect(page.getByText('Cập nhật sản phẩm thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect(drawer.getByText(`${newPrice.toLocaleString('vi-VN')} đ`)).toBeVisible();
      await expect(drawer.getByText(`${newMinStock} chai`, { exact: true })).toBeVisible();

      await drawer.getByRole('button', { name: 'Đóng', exact: true }).click();
      await expect(productRow(page, sku)).toContainText(`${newPrice.toLocaleString('vi-VN')} đ`);

      const detail = await api.get<{ sell_price: number; min_stock: number }>(
        `/products/${product.id}`,
      );
      expect(detail.sell_price).toBe(newPrice);
      expect(detail.min_stock).toBe(newMinStock);
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });

  test('E2E-PRD-004 validate sản phẩm', { tag: '@p0' }, async ({ page }) => {
    const posts: string[] = [];
    page.on('request', (request) => {
      if (
        request.method() === 'POST' &&
        new URL(request.url()).pathname === '/api/v1/products'
      ) {
        posts.push(request.url());
      }
    });

    await page.goto('/products');
    await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
    const dialog = page.getByRole('dialog', { name: 'Thêm mới sản phẩm', exact: true });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[name="sku"]').fill('   ');
    await dialog.locator('input[name="name"]').fill('   ');
    await dialog.getByRole('button', { name: 'Lưu sản phẩm' }).click();

    await expect(
      dialog.getByText('Vui lòng nhập SKU và tên sản phẩm', { exact: true }),
    ).toBeVisible();
    await expect(dialog).toBeVisible();
    expect(posts).toHaveLength(0);
  });
});
