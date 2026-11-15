import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { tag, uniquePhone } from '../support/data';

type GeneralSettingsPayload = {
  organization: Record<string, unknown>;
  working_hours: Record<string, unknown>;
  payroll: Record<string, unknown>;
};

type BookingSettingsPayload = {
  allow_online_booking: boolean;
  auto_confirm: boolean;
  slot_step_minutes: number;
  max_per_slot: number;
  min_lead_minutes: number;
  max_advance_days: number;
  allow_cancel: boolean;
  cancel_before_hours: number;
  max_cancellations_per_month: number;
  allow_reschedule: boolean;
  reschedule_before_hours: number;
  deposit_enabled: boolean;
  no_show_threshold: number;
  no_show_lookback_days: number;
  deposit_percent: number;
  deposit_max_amount: number;
};

type PaymentMethodPayload = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

type PaymentSettingsPayload = {
  receipt: Record<string, unknown>;
  payment_methods: PaymentMethodPayload[];
};

type NotificationSettingsPayload = {
  appointment_reminder: boolean;
  new_booking_alert: boolean;
  low_stock_alert: boolean;
  daily_revenue_report: boolean;
  birthday_voucher: boolean;
  reminder_hours_before: number;
  low_stock_threshold: number;
  daily_report_time: string;
};

type CashFlowCategoryPayload = {
  id: string;
  code: string;
  name: string;
  category_type: 'revenue' | 'operating_expense' | 'non_pnl';
};

function field(page: Page, label: RegExp | string): Locator {
  return page.getByLabel(label).first();
}

async function expectConnected(page: Page): Promise<void> {
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
}

async function save(page: Page, toastTitle: string): Promise<void> {
  await page.getByTestId('settings-save').click();
  await expect(page.getByText(toastTitle, { exact: true })).toBeVisible();
}

async function switchOn(locator: Locator): Promise<boolean> {
  return (await locator.getAttribute('aria-checked')) === 'true';
}

async function setSwitch(locator: Locator, checked: boolean): Promise<void> {
  if ((await switchOn(locator)) !== checked) {
    await locator.click();
    await expect(locator).toHaveAttribute('aria-checked', String(checked));
  }
}

async function restore(
  api: ApiClient,
  path: string,
  payload: unknown,
): Promise<void> {
  await api.put(path, payload);
}

test.describe('E2E-SET cài đặt salon', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-SET-001 lưu cài đặt cửa hàng', { tag: '@p2' }, async ({ page, api }) => {
    const original = await api.get<GeneralSettingsPayload>('/settings/general');
    const name = tag('Salon SET-001');
    const phone = uniquePhone();
    const email = `${tag('set001').toLowerCase()}@example.com`;
    const address = `Địa chỉ ${tag('SET-001')}`;

    try {
      await page.goto('/settings/general');
      await expectConnected(page);

      const nameInput = field(page, /Tên Salon/);
      await expect(nameInput).not.toHaveValue('');
      await nameInput.fill(name);
      await field(page, /Số điện thoại hotline/).fill(phone);
      await field(page, /Email liên hệ/).fill(email);
      await field(page, /Địa chỉ cơ sở salon/).fill(address);

      await save(page, 'Đã lưu cài đặt chung');

      await page.reload();
      await expectConnected(page);
      await expect(field(page, /Tên Salon/)).toHaveValue(name);
      await expect(field(page, /Số điện thoại hotline/)).toHaveValue(phone);
      await expect(field(page, /Email liên hệ/)).toHaveValue(email);
      await expect(field(page, /Địa chỉ cơ sở salon/)).toHaveValue(address);
    } finally {
      await restore(api, '/settings/general', original);
    }
  });

  test('E2E-SET-002 validate cài đặt cửa hàng', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/settings/general');
    await expectConnected(page);

    await field(page, /Tên Salon/).fill('');
    await expect(page.getByText('Vui lòng nhập tên salon.')).toBeVisible();

    await field(page, /Email liên hệ/).fill('email-sai');
    await expect(page.getByText('Email không đúng định dạng.')).toBeVisible();

    await field(page, /Giờ mở cửa/).fill('18:00');
    await field(page, /Giờ đóng cửa/).fill('09:00');
    await expect(page.getByText('Giờ đóng phải sau giờ mở.')).toBeVisible();

    const toggleAll = page.getByRole('button', {
      name: /^(Chọn tất cả|Bỏ chọn tất cả)$/,
    });
    if ((await toggleAll.textContent())?.includes('Bỏ chọn')) {
      await toggleAll.click();
    } else {
      await toggleAll.click();
      await toggleAll.click();
    }
    await expect(page.getByText('Vui lòng chọn ít nhất một ngày áp dụng.')).toBeVisible();

    await expect(page.getByTestId('settings-save')).toBeDisabled();
  });

  test('E2E-SET-003 lưu cài đặt lịch hẹn và validate', { tag: '@p2' }, async ({ page, api }) => {
    const original = await api.get<BookingSettingsPayload>('/settings/booking');
    const slotLabel = original.slot_step_minutes === 60 ? '30 phút' : '60 phút';
    const autoConfirm = page.getByTestId('settings-booking-auto-confirm-toggle');
    const expectedAutoConfirm = !original.auto_confirm;

    try {
      await page.goto('/settings/booking');
      await expectConnected(page);

      await page.locator('[data-slot="select-trigger"]').first().click();
      await page
        .locator('[data-slot="select-item"]')
        .filter({ hasText: slotLabel })
        .first()
        .click();
      await setSwitch(autoConfirm, expectedAutoConfirm);

      await save(page, 'Đã lưu cài đặt lịch hẹn');

      await page.reload();
      await expectConnected(page);
      await expect(page.locator('[data-slot="select-trigger"]').first()).toContainText(slotLabel);
      await expect(page.getByTestId('settings-booking-auto-confirm-toggle')).toHaveAttribute(
        'aria-checked',
        String(expectedAutoConfirm),
      );

      await field(page, /Số khách tối đa \/ khung giờ/).fill('0');
      await expect(page.getByText('Số khách mỗi khung giờ phải lớn hơn 0.')).toBeVisible();

      await setSwitch(page.getByTestId('settings-booking-deposit-toggle'), true);
      await field(page, /Tỷ lệ cọc theo giá trị đơn/).fill('101');
      await expect(
        page.getByText('Tỷ lệ cọc phải nằm trong khoảng 0–100%.'),
      ).toBeVisible();

      await expect(page.getByTestId('settings-save')).toBeDisabled();
    } finally {
      await restore(api, '/settings/booking', original);
    }
  });

  test('E2E-SET-004 ràng buộc phương thức thanh toán', { tag: '@p2' }, async ({ page, api }) => {
    const original = await api.get<PaymentSettingsPayload>('/settings/payment');

    try {
      await page.goto('/settings/payment');
      await expectConnected(page);

      const methods = page.getByTestId(/^settings-payment-method-.*-toggle$/);
      await expect(methods.first()).toBeVisible();
      const methodCount = await methods.count();

      for (let index = 0; index < methodCount; index += 1) {
        await setSwitch(methods.nth(index), false);
      }

      const warning = page.getByText('Vui lòng bật ít nhất một phương thức thanh toán.');
      await expect(warning).toBeVisible();
      await expect(page.getByTestId('settings-save')).toBeDisabled();

      await setSwitch(methods.first(), true);
      await expect(warning).toHaveCount(0);
      await expect(page.getByTestId('settings-save')).toBeEnabled();

      await save(page, 'Đã lưu cài đặt thanh toán');

      await page.reload();
      await expectConnected(page);
      const reloaded = page.getByTestId(/^settings-payment-method-.*-toggle$/);
      await expect(reloaded.first()).toHaveAttribute('aria-checked', 'true');

      let activeCount = 0;
      for (let index = 0; index < (await reloaded.count()); index += 1) {
        if (await switchOn(reloaded.nth(index))) activeCount += 1;
      }
      expect(activeCount).toBe(1);
    } finally {
      await restore(api, '/settings/payment', original);
    }
  });

  test('E2E-SET-005 tài chính và quỹ (partial mock)', { tag: ['@p2', '@blocked-mock'] }, async ({
    page,
    api,
  }) => {
    const categories = await api.get<CashFlowCategoryPayload[]>('/cashflow-categories');

    await page.goto('/settings/finance');
    await expectConnected(page);

    for (const group of ['Doanh thu', 'Chi phí vận hành', 'Ngoài P&L']) {
      await expect(page.getByRole('heading', { level: 4, name: group, exact: true })).toBeVisible();
    }

    const first = categories[0];
    if (first) {
      await expect(page.getByText(first.name, { exact: true }).first()).toBeVisible();
      await expect(page.getByText(first.code, { exact: true }).first()).toBeVisible();
    }

    const shiftClosing = page.getByTestId('settings-finance-shift-closing-toggle');
    const expected = !(await switchOn(shiftClosing));
    await setSwitch(shiftClosing, expected);

    await page.reload();
    await expectConnected(page);
    await expect(page.getByTestId('settings-finance-shift-closing-toggle')).toHaveAttribute(
      'aria-checked',
      String(expected),
    );
  });

  test('E2E-SET-006 lưu cấu hình thông báo và validate', { tag: '@p2' }, async ({ page, api }) => {
    const original = await api.get<NotificationSettingsPayload>('/settings/notifications');
    const reminderHours =
      original.reminder_hours_before === 3 ? 4 : 3;

    try {
      await page.goto('/settings/notifications');
      await expectConnected(page);

      const reminder = page.getByTestId('settings-notifications-reminder-toggle');
      const lowStock = page.getByTestId('settings-notifications-low-stock-toggle');
      await setSwitch(reminder, true);
      await field(page, 'Nhắc trước').fill(String(reminderHours));
      await setSwitch(lowStock, true);

      await save(page, 'Đã lưu cấu hình thông báo');

      await page.reload();
      await expectConnected(page);
      await expect(page.getByTestId('settings-notifications-reminder-toggle')).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await expect(field(page, 'Nhắc trước')).toHaveValue(String(reminderHours));
      await expect(page.getByTestId('settings-notifications-low-stock-toggle')).toHaveAttribute(
        'aria-checked',
        'true',
      );

      await field(page, 'Nhắc trước').fill('169');
      await expect(
        page.getByText('Thời gian nhắc trước phải nằm trong khoảng 0–168 giờ.'),
      ).toBeVisible();

      await field(page, 'Ngưỡng cảnh báo').fill('0');
      await expect(page.getByText('Ngưỡng cảnh báo phải lớn hơn 0.')).toBeVisible();

      await expect(page.getByTestId('settings-save')).toBeDisabled();
    } finally {
      await restore(api, '/settings/notifications', original);
    }
  });

  test('E2E-SET-007 CRM coming soon', { tag: '@p2' }, async ({ page }) => {
    await page.goto('/settings/crm');

    await expect(
      page.getByRole('heading', { level: 2, name: 'Khách hàng & Loyalty', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Hạng thành viên (Bạc, Vàng, Kim Cương) và ngưỡng chi tiêu'),
    ).toBeVisible();
    await expect(page.getByText('Tỷ lệ tích điểm và quy đổi điểm')).toBeVisible();

    const note = page.getByText(/Phần này sẽ được triển khai ở giai đoạn sau/);
    await expect(note).toBeVisible();
    await expect(note.getByRole('link', { name: 'Tài chính & Quỹ' })).toHaveAttribute(
      'href',
      '/settings/finance',
    );
  });
});
