import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { createStaff, tag, uniquePhone } from '../support/data';
import { hasRole } from '../support/tokens';

const SEARCH_PLACEHOLDER = 'Tìm theo tên nhân viên, SĐT, mã NV...';

type StaffRecord = {
  id: string;
  code: string;
  full_name: string;
  phone: string;
  position: string;
  commission_rate: number;
  status: 'active' | 'inactive';
};

type SalaryAdjustment = {
  id: string;
  payroll_id: string | null;
  reason: string;
};

function staffRow(page: Page, text: string): Locator {
  return page.getByRole('row').filter({ hasText: text });
}

function tzDateParts(): { year: string; month: string } {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(),
  );
  const [year, month] = iso.split('-');
  return { year, month };
}

function isoDayThisMonth(day: number): string {
  const { year, month } = tzDateParts();
  return `${year}-${month}-${String(day).padStart(2, '0')}`;
}

function currentPeriod(): { value: string; label: string } {
  const { year, month } = tzDateParts();
  return { value: `${year}-${month}`, label: `Tháng ${month}/${year}` };
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

async function searchStaff(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

async function pickSelect(
  page: Page,
  scope: Locator | Page,
  index: number,
  label: string,
): Promise<void> {
  await scope.locator('[data-slot="select-trigger"]').nth(index).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

async function openCreateStaffDialog(page: Page): Promise<Locator> {
  await page.goto('/staff');
  await page.getByRole('button', { name: 'Thêm nhân viên' }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm mới nhân viên', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

function leavePicker(dialog: Locator, label: string): Locator {
  return dialog.locator('label').filter({ hasText: label }).first().getByRole('button').first();
}

async function pickCalendarDay(page: Page, trigger: Locator, iso: string): Promise<void> {
  await trigger.click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  const day = page.locator(`[data-day="${iso}"] button`);
  await expect(day).toBeVisible();
  await day.click();
}

async function findStaffByPhone(api: ApiClient, phone: string): Promise<StaffRecord | undefined> {
  const result = await api.get<{ data: StaffRecord[] }>('/staff', {
    search: phone,
    page: 1,
    page_size: 50,
  });
  return result.data.find((row) => row.phone === phone);
}

async function cleanupStaff(api: ApiClient, id: string): Promise<void> {
  try {
    await api.delete(`/staff/${id}`);
  } catch {}
}

async function cleanupAdjustments(
  api: ApiClient,
  staffId: string,
  periodMonth: string,
): Promise<void> {
  try {
    const rows = await api.get<SalaryAdjustment[]>(`/staff/${staffId}/salary-adjustments`, {
      period_month: periodMonth,
    });
    for (const row of rows) {
      if (!row.payroll_id) await api.delete(`/staff/salary-adjustment/${row.id}`);
    }
  } catch {}
}

test.describe('E2E-STF staff', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-STF-001 danh sách, tìm kiếm và lọc nhân viên', { tag: '@p1' }, async ({ page, api }) => {
    const shared = tag('STF-001');
    const activeName = `NV Active ${shared}`;
    const inactiveName = `NV Inactive ${shared}`;
    const active = await createStaff(api, {
      full_name: activeName,
      phone: uniquePhone(),
      position: 'Stylist',
      status: 'active',
    });
    const inactive = await createStaff(api, {
      full_name: inactiveName,
      phone: uniquePhone(),
      position: 'Lễ tân',
      status: 'inactive',
    });

    try {
      await page.goto('/staff');
      await expect(page.getByRole('heading', { level: 1, name: 'Nhân viên' })).toBeVisible();
      await expect(page.getByText(/Không tải được danh sách nhân viên/)).toHaveCount(0);

      for (const header of [
        'Nhân viên',
        'Vị trí',
        'SĐT',
        'Hoa hồng',
        'Ngày vào làm',
        'Trạng thái',
      ]) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }

      await searchStaff(page, shared);
      const activeRow = staffRow(page, activeName);
      const inactiveRow = staffRow(page, inactiveName);
      await expect(activeRow).toBeVisible();
      await expect(activeRow).toContainText('Stylist');
      await expect(activeRow).toContainText('Hoạt động');
      await expect(inactiveRow).toBeVisible();
      await expect(inactiveRow).toContainText('Tạm ngưng');

      await pickSelect(page, page, 0, 'Đang hoạt động');
      await expect(page).toHaveURL(/[?&]status=active/);
      await expect(activeRow).toBeVisible();
      await expect(inactiveRow).toBeHidden();

      await pickSelect(page, page, 0, 'Tạm ngưng');
      await expect(page).toHaveURL(/[?&]status=inactive/);
      await expect(inactiveRow).toBeVisible();
      await expect(activeRow).toBeHidden();

      await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
      await expect(page).toHaveURL(/\/staff(\?)?$/);
      await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('');

      await pickSelect(page, page, 1, 'Tên A – Z');
      await expect(page).toHaveURL(/[?&]sort=name_asc/);
      await pickSelect(page, page, 1, 'Vào làm mới nhất');
      await expect(page).toHaveURL(/[?&]sort=hire_date_desc/);
    } finally {
      await cleanupStaff(api, active.id);
      await cleanupStaff(api, inactive.id);
    }
  });

  test('E2E-STF-002 tạo nhân viên', { tag: '@p0' }, async ({ page, api }) => {
    const name = `Nhân viên mới ${tag('STF-002')}`;
    const phone = uniquePhone();
    let createdId: string | null = null;

    try {
      const dialog = await openCreateStaffDialog(page);
      await dialog.locator('input[name="full_name"]').fill(name);
      await dialog.locator('input[name="phone"]').fill(phone);
      await pickSelect(page, dialog, 0, 'Stylist');
      await dialog.locator('input[name="base_salary"]').fill('8000000');
      await dialog.locator('input[name="commission_rate"]').fill('12');

      await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
      await expect(page.getByText('Tạo nhân viên thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const created = await findStaffByPhone(api, phone);
      expect(created).toBeTruthy();
      createdId = created?.id ?? null;

      await searchStaff(page, phone);
      const row = staffRow(page, name);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Stylist');
      await expect(row).toContainText(phone);
      await expect(row).toContainText('12%');
      await expect(row).toContainText('Hoạt động');
    } finally {
      if (!createdId) {
        const created = await findStaffByPhone(api, phone).catch(() => undefined);
        createdId = created?.id ?? null;
      }
      if (createdId) await cleanupStaff(api, createdId);
    }
  });

  test('E2E-STF-003 validate form nhân viên', { tag: '@p0' }, async ({ page }) => {
    let postCount = 0;
    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (new URL(request.url()).pathname === '/api/v1/staff') postCount += 1;
    });

    const dialog = await openCreateStaffDialog(page);

    await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
    await expect(
      dialog.getByText('Vui lòng nhập họ tên, số điện thoại và vị trí', { exact: true }),
    ).toBeVisible();

    await dialog.locator('input[name="full_name"]').fill(`Nhân viên ${tag('STF-003')}`);
    await dialog.locator('input[name="phone"]').fill(uniquePhone());
    await pickSelect(page, dialog, 0, 'Stylist');

    const commission = dialog.locator('input[name="commission_rate"]');
    await commission.evaluate((el) => el.removeAttribute('max'));
    await commission.fill('150');
    await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
    await expect(
      dialog.getByText('Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 100', { exact: true }),
    ).toBeVisible();

    await commission.evaluate((el) => el.removeAttribute('min'));
    await commission.fill('-1');
    await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
    await expect(
      dialog.getByText('Tỷ lệ hoa hồng phải nằm trong khoảng từ 0 đến 100', { exact: true }),
    ).toBeVisible();

    await commission.fill('10');
    const baseSalary = dialog.locator('input[name="base_salary"]');
    await baseSalary.evaluate((el) => el.removeAttribute('min'));
    await baseSalary.fill('-500000');
    await dialog.getByRole('button', { name: 'Lưu nhân viên' }).click();
    await expect(
      dialog.getByText('Lương cơ bản không được âm', { exact: true }),
    ).toBeVisible();

    expect(postCount).toBe(0);
  });

  test('E2E-STF-004 sửa thông tin chung', { tag: '@p1' }, async ({ page, api }) => {
    const phone = uniquePhone();
    const originalName = `NV gốc ${tag('STF-004')}`;
    const updatedName = `NV đã sửa ${tag('STF-004')}`;
    const staff = await createStaff(api, {
      full_name: originalName,
      phone,
      position: 'Stylist',
      status: 'active',
    });

    try {
      await page.goto(`/staff/${staff.id}`);
      await expect(page.getByRole('tab', { name: 'Thông tin chung' })).toBeVisible();

      const nameInput = page.locator('input[name="full_name"]');
      await expect(nameInput).toHaveValue(originalName);
      await nameInput.fill(updatedName);

      const inactivePill = page.getByRole('button', { name: 'Tạm ngưng', exact: true });
      await inactivePill.click();
      await expect(inactivePill).toHaveAttribute('aria-pressed', 'true');

      await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
      await expect(
        page.getByText('Cập nhật nhân viên thành công', { exact: true }),
      ).toBeVisible();

      await page.reload();
      await expect(page.locator('input[name="full_name"]')).toHaveValue(updatedName);
      await expect(
        page.getByRole('button', { name: 'Tạm ngưng', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');

      const updated = await api.get<StaffRecord>(`/staff/${staff.id}`);
      expect(updated.full_name).toBe(updatedName);
      expect(updated.status).toBe('inactive');
    } finally {
      await cleanupStaff(api, staff.id);
    }
  });

  test('E2E-STF-005 chốt lương kỳ hiện tại', { tag: '@p0' }, async ({ page, api, pageAs }) => {
    const staff = await createStaff(api, {
      full_name: `NV lương ${tag('STF-005')}`,
      phone: uniquePhone(),
      position: 'Stylist',
      hire_date: daysAgoIso(60),
    });

    try {
      await page.goto(`/staff/${staff.id}?tab=payroll`);
      await expect(page.getByText('Bảng lương chi tiết', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Chốt lương', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Chốt lương', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Chốt bảng lương kỳ tháng');
      await dialog.getByRole('button', { name: 'Chốt lương', exact: true }).click();

      await expect(
        page.locator('[data-slot="toast"]').filter({ hasText: 'Đã chốt lương' }),
      ).toBeVisible();
      await expect(page.getByText('ĐÃ CHỐT', { exact: true })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Đã chốt lương', exact: true }),
      ).toBeDisabled();

      if (hasRole('manager')) {
        const managerPage = await pageAs('manager');
        await injectAccessToken(managerPage, 'manager');
        await managerPage.goto(`/staff/${staff.id}`);
        await expect(managerPage.getByRole('tab', { name: 'Thông tin chung' })).toBeVisible();
        await expect(managerPage.getByRole('tab', { name: 'Bảng lương' })).toHaveCount(0);
      }
    } finally {
      await cleanupStaff(api, staff.id);
    }
  });

  test('E2E-STF-006 thưởng/phạt và hủy khoản', { tag: '@p0' }, async ({ page, api }) => {
    const staff = await createStaff(api, {
      full_name: `NV thưởng ${tag('STF-006')}`,
      phone: uniquePhone(),
      position: 'Stylist',
    });
    const reason = `Thưởng KPI ${tag('STF-006')}`;
    const period = currentPeriod();

    try {
      await page.goto(`/staff/${staff.id}?tab=reward-penalty`);
      await expect(page.getByText('Lịch sử Thưởng/Phạt', { exact: true }).first()).toBeVisible();

      await page.getByRole('button', { name: 'Thêm thưởng phạt' }).click();
      const dialog = page.getByRole('dialog', { name: 'Tạo khoản thưởng/phạt', exact: true });
      await expect(dialog).toBeVisible();

      await dialog.locator('#salary-adjustment-amount').fill('0');
      await dialog.locator('#salary-adjustment-reason').fill('   ');
      await dialog.getByRole('button', { name: 'Tạo khoản' }).click();
      await expect(dialog.getByText('Số tiền phải lớn hơn 0', { exact: true })).toBeVisible();

      await dialog.locator('#salary-adjustment-amount').fill('500000');
      await dialog.getByRole('button', { name: 'Tạo khoản' }).click();
      await expect(dialog.getByText('Vui lòng nhập lý do', { exact: true })).toBeVisible();

      await dialog.locator('#salary-adjustment-reason').fill(reason);
      await pickSelect(page, dialog, 1, period.label);
      await dialog.getByRole('button', { name: 'Tạo khoản' }).click();

      await expect(page.getByText('Đã tạo khoản thưởng', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const row = staffRow(page, reason);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Thưởng');
      await expect(row).toContainText('Chờ chốt');

      await row.getByRole('button', { name: 'Hủy khoản điều chỉnh' }).click();
      const deleteDialog = page.getByRole('dialog', { name: 'Hủy khoản thưởng/phạt', exact: true });
      await expect(deleteDialog).toBeVisible();
      await deleteDialog.getByRole('button', { name: 'Hủy khoản này' }).click();
      await expect(
        page.getByText('Đã hủy khoản điều chỉnh', { exact: true }),
      ).toBeVisible();
      await expect(staffRow(page, reason)).toBeHidden();
    } finally {
      await cleanupAdjustments(api, staff.id, period.value);
      await cleanupStaff(api, staff.id);
    }
  });

  test('E2E-STF-007 thêm ngày nghỉ và validate', { tag: '@p0' }, async ({ page, api }) => {
    const staff = await createStaff(api, {
      full_name: `NV nghỉ ${tag('STF-007')}`,
      phone: uniquePhone(),
      position: 'Stylist',
    });
    const note = `Việc gia đình ${tag('STF-007')}`;

    try {
      await page.goto(`/staff/${staff.id}?tab=schedule`);
      await page.getByRole('button', { name: 'Thêm ngày nghỉ' }).click();

      const dialog = page.getByRole('dialog', { name: 'Thêm ngày nghỉ', exact: true });
      await expect(dialog).toBeVisible();

      await dialog.getByRole('button', { name: 'Lưu ngày nghỉ' }).click();
      await expect(
        dialog.getByText('Vui lòng chọn ngày bắt đầu và ngày kết thúc.', { exact: true }),
      ).toBeVisible();

      await dialog.getByRole('button', { name: 'Nghỉ phép năm', exact: true }).click();
      await pickCalendarDay(page, leavePicker(dialog, 'Từ ngày'), isoDayThisMonth(12));
      await pickCalendarDay(page, leavePicker(dialog, 'Đến ngày'), isoDayThisMonth(10));
      await dialog.getByRole('button', { name: 'Lưu ngày nghỉ' }).click();
      await expect(
        dialog.getByText('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.', { exact: true }),
      ).toBeVisible();

      await pickCalendarDay(page, leavePicker(dialog, 'Đến ngày'), isoDayThisMonth(14));
      await dialog.getByPlaceholder('Ví dụ: Việc gia đình').fill(note);
      await dialog.getByRole('button', { name: 'Lưu ngày nghỉ' }).click();

      await expect(page.getByText('Đã thêm ngày nghỉ', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const row = staffRow(page, note);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Nghỉ phép năm');
      await expect(row).toContainText('3 ngày');
    } finally {
      await cleanupStaff(api, staff.id);
    }
  });

  test('E2E-STF-008 tạm ứng (mock)', { tag: ['@p2', '@blocked-mock'] }, async ({ page, api }) => {
    const staff = await createStaff(api, {
      full_name: `NV tạm ứng ${tag('STF-008')}`,
      phone: uniquePhone(),
      position: 'Stylist',
    });

    try {
      await page.goto(`/staff/${staff.id}?tab=payroll`);
      await page.getByRole('button', { name: 'Tạm ứng', exact: true }).click();

      const dialog = page.getByRole('dialog', { name: 'Tạm ứng lương', exact: true });
      await expect(dialog).toBeVisible();

      await dialog.locator('#staff-advance-amount').fill('0');
      await dialog.getByRole('button', { name: 'Ghi nhận tạm ứng' }).click();
      await expect(
        dialog.getByText('Số tiền tạm ứng phải lớn hơn 0', { exact: true }),
      ).toBeVisible();

      await dialog.locator('#staff-advance-amount').fill('1000000');
      await dialog.locator('#staff-advance-note').fill(`Tạm ứng ${tag('STF-008')}`);
      await dialog.getByRole('button', { name: 'Ghi nhận tạm ứng' }).click();

      await expect(dialog).toBeHidden();
      await expect(page.getByText('Bảng lương chi tiết', { exact: true })).toBeVisible();
    } finally {
      await cleanupStaff(api, staff.id);
    }
  });
});
