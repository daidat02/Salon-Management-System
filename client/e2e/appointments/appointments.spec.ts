import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import {
  createAppointment,
  createCustomer,
  createService,
  tag,
  uniquePhone,
} from '../support/data';

type CreatedAppointment = {
  id: string;
  code: string;
};

const TZ = 'Asia/Ho_Chi_Minh';
const APPOINTMENT_DAY_OFFSET = 1 + Math.floor(Math.random() * 20);

function tzToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoWeekday(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

function mondayOf(iso: string): string {
  return addDaysIso(iso, -(isoWeekday(iso) - 1));
}

function ddmm(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

function weekLabel(mondayIso: string): string {
  return `${ddmm(mondayIso)} – ${ddmm(addDaysIso(mondayIso, 6))}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function appointmentWindow(iso: string, hour: number, minute = 0, duration = 30) {
  const start = `${iso}T${pad(hour)}:${pad(minute)}:00+07:00`;
  const endMinutes = hour * 60 + minute + duration;
  const end = `${iso}T${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}:00+07:00`;
  return { start_time: start, end_time: end };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function openList(page: Page): Promise<void> {
  await page.goto('/appointments');
  await page.getByRole('button', { name: 'Danh sách' }).click();
  await expect(page.getByRole('table')).toBeVisible();
}

async function searchList(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder('Tìm theo tên, SĐT, mã lịch...').fill(query);
  await expect(page).toHaveURL(new RegExp(`[?&]search=${encodeURIComponent(query)}`));
}

async function openAppointmentRow(page: Page, code: string): Promise<Locator> {
  const row = page.getByRole('row').filter({ hasText: code });
  await expect(row).toBeVisible();
  await row.click();
  const drawer = page.locator('[data-slot="sheet-content"]');
  await expect(drawer).toBeVisible();
  return drawer;
}

async function openCreateDialog(page: Page): Promise<Locator> {
  await page.goto('/appointments');
  await page.getByRole('main').getByRole('button', { name: 'Đặt lịch mới' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo lịch hẹn mới', exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function lookupCustomer(dialog: Locator, phone: string, name: string): Promise<void> {
  await dialog.locator('#appointment-customer-phone').fill(phone);
  await dialog.getByRole('button', { name: 'Kiểm tra' }).click();
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
}

async function addService(page: Page, dialog: Locator, serviceName: string): Promise<void> {
  await expect(dialog.getByPlaceholder('Tìm và chọn dịch vụ phục vụ...')).toBeVisible();
  await dialog.getByRole('button', { name: 'Mở danh sách' }).click();
  await page.getByRole('option', { name: new RegExp(escapeRegExp(serviceName)) }).click();
  await expect(dialog.getByText(serviceName, { exact: true })).toBeVisible();
}

async function pickDate(
  page: Page,
  dialog: Locator,
  iso: string,
  label = 'Ngày hẹn',
): Promise<void> {
  const section = dialog.locator('label').filter({ hasText: label }).first().locator('..');
  await section.getByRole('button').first().click();
  await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
  const day = page.locator(`[data-day="${iso}"] button`);
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Đến tháng trước' }).click();
  }
  if ((await day.count()) === 0) {
    await page.getByRole('button', { name: 'Đến tháng tiếp theo' }).click();
    await page.getByRole('button', { name: 'Đến tháng tiếp theo' }).click();
  }
  await expect(day).toBeVisible();
  await day.click();
}

async function createTestAppointment(
  api: ApiClient,
  input: { service_id: string },
  overrides: Record<string, unknown> = {},
): Promise<CreatedAppointment> {
  return (await createAppointment(api, input, overrides)) as CreatedAppointment;
}

async function cleanupByPhone(api: ApiClient, phone: string): Promise<void> {
  try {
    const appointments = await api.get<{ data: { id: string }[] }>('/appointments', {
      page: 1,
      page_size: 100,
      search: phone,
    });
    for (const appointment of appointments.data) {
      await api.delete(`/appointments/${appointment.id}`);
    }
  } catch {}
  try {
    const customer = await api.get<{ id: string }>('/customers/phone', { phone });
    await api.delete(`/customers/${customer.id}`);
  } catch {}
}

test.describe('E2E-APT appointments', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-APT-001 lịch tuần mặc định và điều hướng tuần', { tag: ['@smoke', '@p0'] }, async ({ page }) => {
    await page.goto('/appointments');

    await expect(page.getByRole('heading', { level: 1, name: 'Lịch hẹn' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lịch tuần' })).toBeVisible();

    for (const weekday of ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật']) {
      await expect(page.getByText(weekday, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('08:00', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('18:00', { exact: true }).first()).toBeVisible();

    const legend = page.getByText('Trạng thái:', { exact: true }).locator('..');
    for (const label of [
      'Đã hoàn thành',
      'Đang phục vụ',
      'Chờ phục vụ',
      'Đã xác nhận',
      'Đã check-in',
      'Đã hủy',
      'Không đến',
    ]) {
      await expect(legend.getByText(label, { exact: true })).toBeVisible();
    }

    const today = tzToday();
    const monday = mondayOf(today);
    await expect(page.getByText(`Tuần ${weekLabel(monday)}`)).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${escapeRegExp(`Tuần ${weekLabel(monday)}`)} • \\d+ lịch hẹn`)),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Tuần trước' }).click();
    await expect(page.getByText(`Tuần ${weekLabel(addDaysIso(monday, -7))}`)).toBeVisible();

    await page.getByRole('button', { name: 'Tuần sau' }).click();
    await expect(page.getByText(`Tuần ${weekLabel(monday)}`)).toBeVisible();

    await page.getByRole('button', { name: 'Tuần sau' }).click();
    await expect(page.getByText(`Tuần ${weekLabel(addDaysIso(monday, 7))}`)).toBeVisible();

    await page.getByRole('button', { name: 'Tuần này' }).click();
    await expect(page.getByText(`Tuần ${weekLabel(monday)}`)).toBeVisible();
  });

  test('E2E-APT-002 danh sách, tìm kiếm và lọc trạng thái', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-002') });
    const phone = uniquePhone();
    const appointment = await createTestAppointment(
      api,
      { service_id: service.id },
      {
        status: 'confirmed',
        customer_phone: phone,
        ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 9, 15),
      },
    );

    await openList(page);

    for (const header of [
      'Giờ hẹn',
      'Khách hàng',
      'Thông tin',
      'Nhân viên',
      'Tạm tính',
      'Trạng thái',
    ]) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }

    await searchList(page, phone);
    await expect(page.getByRole('row').filter({ hasText: appointment.code })).toBeVisible();

    await page.locator('[data-slot="select-trigger"]').first().click();
    await page.locator('[data-slot="select-item"]').filter({ hasText: 'Đã xác nhận' }).click();

    await expect(page).toHaveURL(/[?&]status=confirmed/);
    const row = page.getByRole('row').filter({ hasText: appointment.code });
    await expect(row).toBeVisible();
    await expect(row.getByText('Đã xác nhận')).toBeVisible();

    await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
    await expect(page).toHaveURL(/\/appointments(\?)?$/);
    expect(new URL(page.url()).pathname).toBe('/appointments');
    expect(new URL(page.url()).search).toBe('');
  });

  test('E2E-APT-003 tạo lịch cho khách cũ', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ APT-003') });
    const booking = await api.get<{ auto_confirm: boolean }>('/settings/booking');

    const dialog = await openCreateDialog(page);
    await lookupCustomer(dialog, customer.phone as string, customer.full_name as string);
    await addService(page, dialog, service.name);

    await pickDate(page, dialog, addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET));
    await dialog.locator('#appointment-start-time').fill('10:15');
    await dialog.getByRole('button', { name: 'Lưu lịch hẹn' }).click();

    await expect(page.getByText('Đã tạo lịch hẹn', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();

    await openList(page);
    await searchList(page, customer.phone as string);
    const row = page.getByRole('row').filter({ hasText: customer.full_name as string });
    await expect(row).toBeVisible();
    await expect(row.getByText(booking.auto_confirm ? 'Đã xác nhận' : 'Chờ xác nhận')).toBeVisible();
  });

  test('E2E-APT-004 tạo lịch cho khách mới', async ({ page, api }) => {
    const phone = uniquePhone();
    const name = `Khách mới ${tag('APT-004')}`;
    const service = await createService(api, { name: tag('Dịch vụ APT-004') });

    try {
      const dialog = await openCreateDialog(page);
      await dialog.locator('#appointment-customer-phone').fill(phone);
      await dialog.getByRole('button', { name: 'Kiểm tra' }).click();
      await expect(
        dialog.getByText(`Không tìm thấy khách với SĐT ${phone} — nhập tên để tạo khách mới.`),
      ).toBeVisible();

      await dialog.locator('#appointment-customer-name').fill(name);
      await addService(page, dialog, service.name);
      await pickDate(page, dialog, addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET));
      await dialog.locator('#appointment-start-time').fill('11:15');
      await dialog.getByRole('button', { name: 'Lưu lịch hẹn' }).click();

      await expect(page.getByText('Đã tạo lịch hẹn', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await openList(page);
      await searchList(page, phone);
      const row = page.getByRole('row').filter({ hasText: name });
      await expect(row).toBeVisible();
      await expect(row.getByText(phone)).toBeVisible();
    } finally {
      await cleanupByPhone(api, phone);
    }
  });

  test('E2E-APT-005 validate tạo lịch', async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-005') });
    let createCalls = 0;
    await page.route('**/api/v1/appointments', async (route) => {
      if (route.request().method() === 'POST') createCalls += 1;
      await route.continue();
    });

    const dialog = await openCreateDialog(page);
    const save = dialog.getByRole('button', { name: 'Lưu lịch hẹn' });

    await save.click();
    await expect(dialog.getByText('Vui lòng nhập số điện thoại khách hàng.')).toBeVisible();

    const phone = uniquePhone();
    await dialog.locator('#appointment-customer-phone').fill(phone);
    await save.click();
    await expect(
      dialog.getByText('Vui lòng bấm Kiểm tra SĐT hoặc chọn Khách mới để nhập tên.'),
    ).toBeVisible();

    await dialog.getByRole('button', { name: 'Khách mới' }).click();
    await dialog.locator('#appointment-customer-name').fill(`Khách validate ${tag('APT-005')}`);
    await save.click();
    await expect(dialog.getByText('Vui lòng chọn ít nhất một dịch vụ.')).toBeVisible();

    await addService(page, dialog, service.name);
    await dialog.locator('#appointment-start-time').fill('');
    await save.click();
    await expect(dialog.getByText('Vui lòng chọn ngày và giờ hẹn hợp lệ.')).toBeVisible();

    expect(createCalls).toBe(0);
  });

  test('E2E-APT-006 drawer chi tiết lịch hẹn', { tag: '@p0' }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-006') });
    const customerName = `Khách E2E ${tag('APT-006')}`;
    const withItem = await createTestAppointment(
      api,
      { service_id: service.id },
      {
        customer_name: customerName,
        note: 'Ghi chú E2E APT-006',
        status: 'confirmed',
        ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 14, 15),
      },
    );
    const withoutItem = await createTestAppointment(
      api,
      { service_id: service.id },
      {
        items: [],
        note: '',
        status: 'confirmed',
        ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 14, 45),
      },
    );

    await openList(page);

    await searchList(page, withItem.code);
    let drawer = await openAppointmentRow(page, withItem.code);
    await expect(drawer.getByText(`Mã lịch hẹn: ${withItem.code}`)).toBeVisible();
    await expect(drawer.getByText('Đã xác nhận', { exact: true })).toBeVisible();
    await expect(drawer.getByText(customerName)).toBeVisible();
    await expect(drawer.getByText(service.name)).toBeVisible();
    await expect(drawer.getByText('Ghi chú E2E APT-006')).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Cập nhật' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Đổi lịch' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Hủy lịch' })).toBeVisible();
    await expect(drawer.getByRole('button', { name: 'Bắt đầu thanh toán' })).toBeVisible();
    await expect(drawer.getByTestId('appointment-edit')).toBeVisible();
    await expect(drawer.getByTestId('appointment-reschedule')).toBeVisible();
    await expect(drawer.getByTestId('appointment-cancel')).toBeVisible();
    await expect(drawer.getByTestId('appointment-start-payment')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();

    await searchList(page, withoutItem.code);
    drawer = await openAppointmentRow(page, withoutItem.code);
    await expect(drawer.getByText('Chưa có dịch vụ/sản phẩm.')).toBeVisible();
    await expect(drawer.getByText('Không có ghi chú')).toBeVisible();
  });

  test('E2E-APT-007 đổi lịch hẹn', async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-007') });
    const appointment = await createTestAppointment(
      api,
      { service_id: service.id },
      { status: 'confirmed', ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 15, 45) },
    );

    await openList(page);
    await searchList(page, appointment.code);
    const drawer = await openAppointmentRow(page, appointment.code);

    await drawer.getByTestId('appointment-reschedule').click();
    let dialog = page.getByRole('dialog', { name: 'Đổi lịch hẹn', exact: true });
    await expect(dialog).toBeVisible();

    await pickDate(page, dialog, addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 'Ngày hẹn mới');
    await dialog.locator('#reschedule-start-time').fill('17:15');
    await dialog.getByRole('button', { name: 'Xác nhận đổi lịch' }).click();

    await expect(page.getByText('Đã đổi lịch hẹn', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(drawer.getByText(/17:15 - 17:45/)).toBeVisible();

    await drawer.getByTestId('appointment-reschedule').click();
    dialog = page.getByRole('dialog', { name: 'Đổi lịch hẹn', exact: true });
    await expect(dialog).toBeVisible();
    await pickDate(page, dialog, tzToday(), 'Ngày hẹn mới');
    await dialog.locator('#reschedule-start-time').fill('00:00');
    await dialog.getByRole('button', { name: 'Xác nhận đổi lịch' }).click();

    await expect(dialog.getByText('Không thể đặt lịch trong quá khứ.')).toBeVisible();
  });

  test('E2E-APT-008 hủy lịch hẹn', { tag: ['@smoke', '@p0'] }, async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-008') });
    const appointment = await createTestAppointment(
      api,
      { service_id: service.id },
      { status: 'confirmed', ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 18, 15) },
    );

    await openList(page);
    await searchList(page, appointment.code);
    const drawer = await openAppointmentRow(page, appointment.code);

    await drawer.getByTestId('appointment-cancel').click();
    const dialog = page.getByRole('dialog', { name: 'Hủy lịch hẹn', exact: true });
    await expect(dialog).toBeVisible();

    await dialog.locator('#cancel-reason').fill('Khách bận, hủy bởi E2E');
    await dialog.getByRole('button', { name: 'Xác nhận hủy' }).click();

    await expect(page.getByText('Đã hủy lịch hẹn', { exact: true })).toBeVisible();
    await expect(dialog).toBeHidden();
    await expect(drawer.getByText('Đã hủy', { exact: true })).toBeVisible();
    await expect(drawer.getByTestId('appointment-reschedule')).toBeDisabled();
    await expect(drawer.getByTestId('appointment-cancel')).toBeDisabled();
  });

  test('E2E-APT-009 chặn thanh toán với lịch trạng thái cuối', async ({ page, api }) => {
    const service = await createService(api, { name: tag('Dịch vụ APT-009') });
    const blocked: { status: string; reason: string; hour: number; minute: number }[] = [
      { status: 'completed', reason: 'Lịch đã hoàn thành — không thể tạo đơn.', hour: 9, minute: 45 },
      { status: 'cancelled', reason: 'Lịch đã hủy — không thể tạo đơn.', hour: 10, minute: 45 },
      { status: 'no_show', reason: 'Khách không đến — không thể tạo đơn.', hour: 16, minute: 15 },
    ];

    await openList(page);

    for (const entry of blocked) {
      const appointment = await createTestAppointment(
        api,
        { service_id: service.id },
        {
          status: entry.status,
          ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), entry.hour, entry.minute),
        },
      );
      await searchList(page, appointment.code);
      const drawer = await openAppointmentRow(page, appointment.code);

      await expect(drawer.getByTestId('appointment-start-payment')).toBeDisabled();
      await expect(drawer.getByText(entry.reason)).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
    }

    const confirmed = await createTestAppointment(
      api,
      { service_id: service.id },
      { status: 'confirmed', ...appointmentWindow(addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET), 17, 45) },
    );
    await searchList(page, confirmed.code);
    const drawer = await openAppointmentRow(page, confirmed.code);

    const payButton = drawer.getByTestId('appointment-start-payment');
    await expect(payButton).toBeEnabled();
    await payButton.click();
    await expect(page).toHaveURL(new RegExp(`/cashier/pos\\?appointmentId=${confirmed.id}`));
  });

  test('E2E-APT-010 giờ hẹn trong quá khứ', async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ APT-010A') });
    let createCalls = 0;
    await page.route('**/api/v1/appointments', async (route) => {
      if (route.request().method() === 'POST') createCalls += 1;
      await route.continue();
    });

    const dialog = await openCreateDialog(page);
    await lookupCustomer(dialog, customer.phone as string, customer.full_name as string);
    await addService(page, dialog, service.name);
    await pickDate(page, dialog, addDaysIso(tzToday(), -1));
    await dialog.locator('#appointment-start-time').fill('10:00');
    await dialog.getByRole('button', { name: 'Lưu lịch hẹn' }).click();

    await expect(dialog.getByText('Không thể đặt lịch trong quá khứ.')).toBeVisible();
    expect(createCalls).toBe(0);
  });

  test('E2E-APT-010 giờ hẹn ngoài khung mở cửa', async ({ page, api }) => {
    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ APT-010B') });
    let createCalls = 0;
    await page.route('**/api/v1/appointments', async (route) => {
      if (route.request().method() === 'POST') createCalls += 1;
      await route.continue();
    });

    const dialog = await openCreateDialog(page);
    await lookupCustomer(dialog, customer.phone as string, customer.full_name as string);
    await addService(page, dialog, service.name);
    await pickDate(page, dialog, addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET));
    await dialog.locator('#appointment-start-time').fill('05:00');
    await dialog.getByRole('button', { name: 'Lưu lịch hẹn' }).click();

    await expect(
      dialog.getByText(/Giờ hẹn nằm ngoài khung mở cửa \d{2}:\d{2}–\d{2}:\d{2}\./),
    ).toBeVisible();
    expect(createCalls).toBe(0);
  });

  test('E2E-APT-010 ngày salon đóng cửa', async ({ page, api }) => {
    const general = await api.get<{
      working_hours: { days: { weekday: number; is_open: boolean }[] };
    }>('/settings/general');
    const target = addDaysIso(tzToday(), APPOINTMENT_DAY_OFFSET);
    const weekday = isoWeekday(target);
    const patched = {
      ...general,
      working_hours: {
        ...general.working_hours,
        days: general.working_hours.days.map((day) =>
          day.weekday === weekday ? { ...day, is_open: false } : day,
        ),
      },
    };

    await page.route('**/api/v1/settings/general', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: patched }),
      });
    });
    let createCalls = 0;
    await page.route('**/api/v1/appointments', async (route) => {
      if (route.request().method() === 'POST') createCalls += 1;
      await route.continue();
    });

    const customer = await createCustomer(api);
    const service = await createService(api, { name: tag('Dịch vụ APT-010C') });

    const dialog = await openCreateDialog(page);
    await lookupCustomer(dialog, customer.phone as string, customer.full_name as string);
    await addService(page, dialog, service.name);
    await pickDate(page, dialog, target);
    await dialog.locator('#appointment-start-time').fill('10:00');
    await dialog.getByRole('button', { name: 'Lưu lịch hẹn' }).click();

    await expect(dialog.getByText('Salon đóng cửa vào ngày đã chọn.')).toBeVisible();
    expect(createCalls).toBe(0);
  });

  test.fixme(
    'E2E-APT-010 giờ kết thúc ≤ bắt đầu (form tự tính end time nên không nhập được)',
    async () => {},
  );
});
