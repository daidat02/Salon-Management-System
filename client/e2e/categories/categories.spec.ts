import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { createCategory, tag } from '../support/data';

function categoryCard(page: Page, name: string): Locator {
  return page.locator('div.group').filter({ hasText: name }).first();
}

async function findCategoryByName(api: ApiClient, name: string) {
  const list = await api.get<{ data: { id: string; name: string; is_active: boolean }[] }>(
    '/categories',
    { page: 1, page_size: 100 },
  );
  return list.data.find((category) => category.name === name);
}

async function openProductsTab(page: Page): Promise<void> {
  await page.goto('/categories');
  await page.getByRole('tab', { name: /Danh mục Sản phẩm/ }).click();
  await expect(page).toHaveURL(/[?&]tab=product/);
}

test.describe('E2E-CAT categories', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-CAT-001 tab và tạo danh mục', { tag: '@p1' }, async ({ page, api }) => {
    const name = `Danh mục ${tag('CAT-001')}`;
    const description = `Mô tả ${tag('CAT-001')}`;

    try {
      await page.goto('/categories');
      await expect(page.getByRole('heading', { level: 1, name: 'Quản lý Danh mục' })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Danh mục Dịch vụ/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );

      await page.getByRole('tab', { name: /Danh mục Sản phẩm/ }).click();
      await expect(page).toHaveURL(/[?&]tab=product/);
      await expect(page.getByRole('tab', { name: /Danh mục Sản phẩm/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );

      await page.getByRole('button', { name: 'Thêm danh mục' }).click();
      const dialog = page.getByRole('dialog', { name: 'Thêm mới danh mục', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="name"]').fill(name);
      await dialog.locator('textarea[name="description"]').fill(description);
      await dialog.locator('[data-slot="select-trigger"]').click();
      await page
        .locator('[data-slot="select-item"]')
        .filter({ hasText: 'Sản phẩm' })
        .first()
        .click();

      await dialog.getByRole('button', { name: 'Lưu danh mục' }).click();
      await expect(page.getByText('Tạo danh mục thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const card = categoryCard(page, name);
      await expect(card).toBeVisible();
      await expect(card).toContainText(description);

      const created = await findCategoryByName(api, name);
      expect(created).toBeTruthy();
    } finally {
      try {
        const created = await findCategoryByName(api, name);
        if (created) await api.delete(`/categories/${created.id}`);
      } catch {}
    }
  });

  test('E2E-CAT-002 sửa danh mục', { tag: '@p0' }, async ({ page, api }) => {
    const oldName = `Danh mục cũ ${tag('CAT-002')}`;
    const newName = `Danh mục mới ${tag('CAT-002')}`;
    const newDescription = `Mô tả mới ${tag('CAT-002')}`;
    const category = await createCategory(api, 'product', oldName);

    try {
      await openProductsTab(page);
      const card = categoryCard(page, oldName);
      await expect(card).toBeVisible();
      await card.click();
      await expect(
        page.getByRole('heading', { name: `Chi tiết danh mục: ${oldName}` }),
      ).toBeVisible();

      await card.hover();
      await card.getByTitle('Chỉnh sửa').click();

      const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa danh mục', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.locator('input[name="name"]').fill(newName);
      await dialog.locator('textarea[name="description"]').fill(newDescription);
      await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click();

      await expect(page.getByText('Cập nhật danh mục thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect(categoryCard(page, newName)).toBeVisible();
      await expect(
        page.getByRole('heading', { name: `Chi tiết danh mục: ${newName}` }),
      ).toBeVisible();
      await expect(categoryCard(page, newName)).toContainText(newDescription);

      const updated = await findCategoryByName(api, newName);
      expect(updated).toBeTruthy();
    } finally {
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });

  test('E2E-CAT-003 xóa danh mục', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Danh mục xóa ${tag('CAT-003')}`;
    const category = await createCategory(api, 'product', name);

    try {
      await openProductsTab(page);
      const card = categoryCard(page, name);
      await expect(card).toBeVisible();

      await card.hover();
      await card.getByTitle('Xóa').click();

      const dialog = page.getByRole('dialog', { name: 'Xóa danh mục', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(name);
      await expect(dialog).toContainText('Hành động này không thể hoàn tác');

      await dialog.getByRole('button', { name: 'Xóa danh mục' }).click();
      await expect(page.getByText('Đã xóa danh mục', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect(page.getByRole('heading', { level: 3, name, exact: true })).toHaveCount(0);
      expect(await findCategoryByName(api, name)).toBeUndefined();
    } finally {
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });

  test('E2E-CAT-004 toggle trạng thái hoạt động', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Danh mục ${tag('CAT-004')}`;
    const category = await createCategory(api, 'service', name);

    try {
      await page.goto('/categories');
      const card = categoryCard(page, name);
      await expect(card).toBeVisible();
      await card.click();
      await expect(
        page.getByRole('heading', { name: `Chi tiết danh mục: ${name}` }),
      ).toBeVisible();

      const toggle = page.locator('[data-testid="category-active-toggle"]');
      await expect(toggle).toBeVisible();
      await expect(card.getByText('Hoạt động', { exact: true })).toBeVisible();

      await toggle.click();
      await expect(page.getByText('Đã tạm ẩn danh mục', { exact: true })).toBeVisible();
      await expect(card.getByText('Tạm ẩn', { exact: true })).toBeVisible();
      await expect(page.getByText('Đang tạm ẩn', { exact: true })).toBeVisible();

      await page.reload();
      const reloadedCard = categoryCard(page, name);
      await expect(reloadedCard).toBeVisible();
      await expect(reloadedCard.getByText('Tạm ẩn', { exact: true })).toBeVisible();

      const afterReload = await findCategoryByName(api, name);
      expect(afterReload?.is_active).toBe(false);

      await reloadedCard.click();
      await page.locator('[data-testid="category-active-toggle"]').click();
      await expect(page.getByText('Đã kích hoạt danh mục', { exact: true })).toBeVisible();
      await expect(reloadedCard.getByText('Hoạt động', { exact: true })).toBeVisible();
    } finally {
      try {
        await api.delete(`/categories/${category.id}`);
      } catch {}
    }
  });
});
