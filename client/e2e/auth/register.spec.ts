import { expect, test } from '@playwright/test';
import { uniquePhone } from '../support/data';

const unauth = { cookies: [], origins: [] };

async function fillRegisterForm(
  page: import('@playwright/test').Page,
  data: { phone: string; email: string; password: string; confirm: string; role?: string },
) {
  await page.goto('/register');
  await page.getByLabel('Họ và tên').fill('Khách Đăng Ký E2E');
  await page.getByLabel('Số điện thoại').fill(data.phone);
  await page.getByLabel('Vai trò').selectOption(data.role ?? 'manager');
  await page.getByLabel('Email').fill(data.email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(data.password);
  await page.getByLabel('Nhập lại mật khẩu').fill(data.confirm);
}

test.describe('E2E-REG-001 đăng ký thành công', () => {
  test.use({ storageState: unauth });

  // BLOCKED: POST /api/v1/register hiện trả 500 vì user chưa có organization_id.
  // Bật lại khi backend tạo org/owner hoặc nhận organization hợp lệ.
  test.fixme('E2E-REG-001 đăng ký tài khoản mới', { tag: '@p0' }, async ({ page }) => {
    const phone = uniquePhone();
    const password = 'secret123';
    await fillRegisterForm(page, {
      phone,
      email: `e2e-${phone}@example.com`,
      password,
      confirm: password,
    });

    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Đăng ký thành công' })).toBeVisible();
    await expect(page.getByText(`Tài khoản ${phone} đã được tạo`)).toBeVisible();

    await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Số điện thoại').fill(phone);
    await page.getByLabel('Mật khẩu').fill(password);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await expect(page).toHaveURL(/\/overview$/);
  });
});

test.describe('E2E-REG-002 validate đăng ký', () => {
  test.use({ storageState: unauth });

  test('E2E-REG-002 chặn mật khẩu không khớp và quá ngắn', { tag: '@p0' }, async ({ page }) => {
    const registerRequests: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/register')) {
        registerRequests.push(req.url());
      }
    });

    const phone = uniquePhone();
    await fillRegisterForm(page, {
      phone,
      email: `e2e-${phone}@example.com`,
      password: 'secret123',
      confirm: 'secret124',
    });
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page.getByText('Mật khẩu nhập lại chưa khớp.')).toBeVisible();
    expect(registerRequests).toHaveLength(0);

    await page.getByLabel('Nhập lại mật khẩu').fill('123');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('123');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    await expect(page.getByText('Mật khẩu phải từ 6 ký tự trở lên.')).toBeVisible();
    expect(registerRequests).toHaveLength(0);

    await page.getByLabel('Họ và tên').fill('');
    await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
    const missing = await page
      .getByLabel('Họ và tên')
      .evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
    expect(missing).toBe(true);
    await expect(page).toHaveURL(/\/register$/);
    expect(registerRequests).toHaveLength(0);
  });
});

