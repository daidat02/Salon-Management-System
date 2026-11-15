import type { Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import { createFund, createProduct, createService, createStaff, tag } from '../support/data';
import { hasRole } from '../support/tokens';

async function expectAccessDenied(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Không có quyền truy cập', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Vai trò hiện tại không được phép mở trang này.')).toBeVisible();
}

test.describe('E2E-RBAC phân quyền', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test(
    'E2E-RBAC-001 receptionist bị chặn route',
    { tag: ['@smoke', '@p0'] },
    async ({ pageAs }) => {
      test.skip(!hasRole('receptionist'), 'Chưa cấu hình token receptionist');

      const page = await pageAs('receptionist');
      await injectAccessToken(page, 'receptionist');

      for (const path of [
        '/settings/general',
        '/reports',
        '/inventory/inbound',
        '/inventory/outbound',
        '/staff',
      ]) {
        await page.goto(path);
        await expectAccessDenied(page);
        await page.getByRole('link', { name: 'Về trang tổng quan', exact: true }).click();
        await expect(page).toHaveURL(/\/overview$/);
      }
    },
  );

  test('E2E-RBAC-002 manager không có tab lương', { tag: '@p0' }, async ({ pageAs, api }) => {
    test.skip(!hasRole('manager'), 'Chưa cấu hình token manager');

    const staff = await createStaff(api, { full_name: tag('NV RBAC-002') });

    try {
      const manager = await pageAs('manager');
      await injectAccessToken(manager, 'manager');
      await manager.goto(`/staff/${staff.id}`);

      for (const label of ['Thông tin chung', 'Lịch sử dịch vụ', 'Ngày nghỉ & Ca']) {
        await expect(manager.getByRole('tab', { name: label, exact: true })).toBeVisible();
      }
      await expect(manager.getByRole('tab', { name: 'Bảng lương', exact: true })).toHaveCount(0);
      await expect(
        manager.getByRole('tab', { name: 'Lịch sử Thưởng/Phạt', exact: true }),
      ).toHaveCount(0);

      const owner = await pageAs('owner');
      await injectAccessToken(owner, 'owner');
      await owner.goto(`/staff/${staff.id}`);

      await expect(owner.getByRole('tab', { name: 'Bảng lương', exact: true })).toBeVisible();
      await expect(
        owner.getByRole('tab', { name: 'Lịch sử Thưởng/Phạt', exact: true }),
      ).toBeVisible();
    } finally {
      await api.delete(`/staff/${staff.id}`).catch(() => undefined);
    }
  });

  test('E2E-RBAC-003 cashflow của receptionist', { tag: '@p0' }, async ({ pageAs, api }) => {
    test.skip(!hasRole('receptionist'), 'Chưa cấu hình token receptionist');

    const fund = await createFund(api, { name: tag('Quỹ RBAC-003') });
    const description = tag('Thu RBAC-003');
    const receptionist = await pageAs('receptionist');
    await injectAccessToken(receptionist, 'receptionist');

    await receptionist.goto('/cashflow');
    await expect(
      receptionist.getByRole('button', { name: 'Thêm phiếu', exact: true }),
    ).toBeVisible();
    await receptionist.getByRole('button', { name: 'Thêm phiếu', exact: true }).click();

    const dialog = receptionist.getByRole('dialog', { name: 'Thêm phiếu thu / chi', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[type="number"]').fill('500000');
    await dialog.locator('[data-slot="select-trigger"]').click();
    await receptionist
      .locator('[data-slot="select-item"]')
      .filter({ hasText: fund.name })
      .first()
      .click();
    await dialog.getByPlaceholder(/VD: Thu tiền combo/).fill(description);

    const responsePromise = receptionist.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === 'POST' && url.pathname === '/api/v1/cashflows';
    });
    await dialog.getByRole('button', { name: 'Lưu phiếu', exact: true }).click();

    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    const body = (await response.json()) as { data: { code: string } };
    const code = body.data.code;

    await expect(receptionist.getByText('Tạo phiếu thành công', { exact: true })).toBeVisible();
    await expect(receptionist.locator('[data-testid^="cashflow-approve-"]')).toHaveCount(0);
    await expect(receptionist.getByTestId('cashflow-fund-settings')).toHaveCount(0);

    const owner = await pageAs('owner');
    await injectAccessToken(owner, 'owner');
    await owner.goto(`/cashflow?search=${code}`);
    await expect(owner.getByTestId(`cashflow-approve-${code}`)).toBeVisible();
    await expect(owner.getByTestId('cashflow-fund-settings')).toBeVisible();
  });

  test('E2E-RBAC-004 nút ghi danh mục của receptionist', { tag: '@p0' }, async ({
    pageAs,
    api,
  }) => {
    test.skip(!hasRole('receptionist'), 'Chưa cấu hình token receptionist');

    const productName = tag('SP RBAC-004');
    await createProduct(api, { name: productName });
    const service = await createService(api, { name: tag('DV RBAC-004') });
    const receptionist = await pageAs('receptionist');
    await injectAccessToken(receptionist, 'receptionist');

    await receptionist.goto(`/products?search=${encodeURIComponent(productName)}`);
    await expect(receptionist.getByText('Thêm sản phẩm', { exact: true })).toHaveCount(0);
    await receptionist.getByRole('row').filter({ hasText: productName }).click();
    const productDrawer = receptionist
      .getByRole('dialog')
      .filter({ hasText: 'Chi tiết sản phẩm' });
    await expect(productDrawer).toBeVisible();
    await expect(
      productDrawer.getByRole('button', { name: 'Chỉnh sửa', exact: true }),
    ).toHaveCount(0);
    await receptionist.goto(`/services?search=${encodeURIComponent(service.name)}`);
    await expect(receptionist.getByText('Thêm dịch vụ', { exact: true })).toHaveCount(0);
    await receptionist.getByRole('row').filter({ hasText: service.name }).click();
    const serviceDrawer = receptionist
      .getByRole('dialog')
      .filter({ hasText: 'Chi tiết dịch vụ' });
    await expect(serviceDrawer).toBeVisible();
    await expect(
      serviceDrawer.getByRole('button', { name: 'Chỉnh sửa', exact: true }),
    ).toHaveCount(0);
    await receptionist.goto('/categories');
    await expect(
      receptionist.getByRole('button', { name: 'Thêm danh mục', exact: true }),
    ).toHaveCount(0);
    await expect(receptionist.locator('button[title="Chỉnh sửa"]')).toHaveCount(0);
    await expect(receptionist.locator('button[title="Xóa"]')).toHaveCount(0);

    const owner = await pageAs('owner');
    await injectAccessToken(owner, 'owner');
    await owner.goto('/products');
    await expect(owner.getByRole('button', { name: 'Thêm sản phẩm', exact: true })).toBeVisible();
    await owner.goto('/services');
    await expect(owner.getByRole('button', { name: 'Thêm dịch vụ', exact: true })).toBeVisible();
    await owner.goto('/categories');
    await expect(owner.getByRole('button', { name: 'Thêm danh mục', exact: true })).toBeVisible();
  });

  test('E2E-RBAC-005 sidebar theo role', { tag: '@p0' }, async ({ pageAs }) => {
    test.skip(!hasRole('receptionist'), 'Chưa cấu hình token receptionist');

    const owner = await pageAs('owner');
    await injectAccessToken(owner, 'owner');
    await owner.goto('/overview');
    await expect(owner.getByRole('link', { name: 'Báo cáo', exact: true })).toBeVisible();
    await expect(owner.getByRole('link', { name: 'Cài đặt salon', exact: true })).toBeVisible();
    await expect(owner.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeVisible();

    if (hasRole('manager')) {
      const manager = await pageAs('manager');
      await injectAccessToken(manager, 'manager');
      await manager.goto('/overview');
      await expect(manager.getByRole('link', { name: 'Báo cáo', exact: true })).toBeVisible();
      await expect(
        manager.getByRole('link', { name: 'Cài đặt salon', exact: true }),
      ).toBeVisible();
      await expect(manager.getByRole('button', { name: 'Đăng xuất', exact: true })).toBeVisible();
    }

    const receptionist = await pageAs('receptionist');
    await injectAccessToken(receptionist, 'receptionist');
    await receptionist.goto('/overview');
    await expect(receptionist.getByRole('link', { name: 'Báo cáo', exact: true })).toHaveCount(0);
    await expect(
      receptionist.getByRole('link', { name: 'Cài đặt salon', exact: true }),
    ).toHaveCount(0);
    await expect(
      receptionist.getByRole('button', { name: 'Đăng xuất', exact: true }),
    ).toBeVisible();

    await expect(receptionist.getByRole('link', { name: 'Nhân viên', exact: true })).toBeVisible();
    await expect(receptionist.getByRole('link', { name: 'Kho hàng', exact: true })).toBeVisible();
    await receptionist.getByRole('link', { name: 'Nhân viên', exact: true }).click();
    await expect(receptionist).toHaveURL(/\/staff$/);
    await expectAccessDenied(receptionist);
  });
});
