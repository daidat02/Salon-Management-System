import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import { createCashFlow, createFund, tag } from '../support/data';

const SEARCH_PLACEHOLDER = 'Tìm theo mã phiếu, nội dung...';

type CashflowCategory = {
  id: string;
  code: string;
  name: string;
  kind: 'income' | 'expense';
};

type CashflowRecord = {
  id: string;
  code: string;
  kind: 'income' | 'expense';
  amount: number;
  description: string | null;
  status: 'pending' | 'approved' | 'cancelled';
};

type FundRecord = {
  id: string;
  code: string;
  name: string;
  current_balance: number;
};

function vnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

function todayLabel(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${now.getFullYear()}`;
}

async function createCashflowCategory(
  api: ApiClient,
  kind: 'income' | 'expense',
  name: string,
): Promise<CashflowCategory> {
  return api.post<CashflowCategory>('/cashflow-categories', {
    code: tag(kind === 'income' ? 'DT-E2E' : 'CP-E2E'),
    name,
    kind,
    category_type: kind === 'income' ? 'revenue' : 'operating_expense',
    sort_order: 999,
  });
}

async function findCashflow(api: ApiClient, description: string): Promise<CashflowRecord> {
  const list = await api.get<{ data: CashflowRecord[] }>('/cashflows', {
    search: description,
    page: 1,
    page_size: 50,
  });
  const found = list.data.find((row) => row.description === description);
  expect(found).toBeTruthy();
  return found as CashflowRecord;
}

async function getFund(api: ApiClient, id: string): Promise<FundRecord> {
  const funds = await api.get<FundRecord[]>('/funds', { active_only: false });
  const found = funds.find((fund) => fund.id === id);
  expect(found).toBeTruthy();
  return found as FundRecord;
}

async function findFundByCode(api: ApiClient, code: string): Promise<FundRecord | undefined> {
  const funds = await api.get<FundRecord[]>('/funds', { active_only: false });
  return funds.find((fund) => fund.code === code);
}

async function cancelCashflow(api: ApiClient, id: string): Promise<void> {
  try {
    await api.post(`/cashflows/${id}/cancel`);
  } catch {}
}

async function searchCashflow(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder(SEARCH_PLACEHOLDER).fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

function cashflowRow(page: Page, text: string): Locator {
  return page.getByRole('row').filter({ hasText: text });
}

async function pickFilter(
  page: Page,
  index: number,
  label: string,
): Promise<void> {
  await page.locator('[data-slot="select-trigger"]').nth(index).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

async function pickVoucherFund(page: Page, dialog: Locator, fundName: string): Promise<void> {
  await dialog.locator('[data-slot="select-trigger"]').first().click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: fundName }).first().click();
}

test.describe('E2E-CFL cashflow', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test('E2E-CFL-001 stats, chart và tỷ trọng chi phí', { tag: '@p1' }, async ({ page }) => {
    await page.goto('/cashflow');
    await expect(page.getByRole('heading', { level: 1, name: 'Thu Chi' })).toBeVisible();

    for (const label of ['Tổng Thu', 'Tổng Chi', 'Chi Ngoài P&L', 'Tồn Quỹ Khả Dụng']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(
      page.getByRole('heading', { name: 'Biểu đồ Dòng tiền 7 ngày qua' }),
    ).toBeVisible();
    await expect(page.getByText(/^Thu \(/)).toBeVisible();
    await expect(page.getByText(/^Chi \(/)).toBeVisible();

    await expect(page.getByText(/^Tỷ trọng Chi phí/)).toBeVisible();
    const emptyBreakdown = page.getByText('Chưa có chi phí vận hành trong kỳ', { exact: true });
    const categoryBreakdown = page.getByText(/% \(/);
    await expect(emptyBreakdown.or(categoryBreakdown).first()).toBeVisible();
    await expect(page.getByText(/^Tổng chi phí vận hành trong kỳ:/)).toBeVisible();
  });

  test('E2E-CFL-002 tạo phiếu thu chờ duyệt', { tag: '@p0' }, async ({ page, api }) => {
    const fund = await createFund(api, { opening_balance: 10_000_000 });
    const categoryName = `Danh mục thu ${tag('CFL-002')}`;
    const category = await createCashflowCategory(api, 'income', categoryName);
    const description = `Thu tiền combo ${tag('CFL-002')}`;
    const amount = 750_000;
    const balanceBefore = (await getFund(api, fund.id)).current_balance;
    let createdId: string | null = null;

    try {
      await page.goto('/cashflow');
      await page.getByRole('button', { name: 'Thêm phiếu' }).click();

      const dialog = page.getByRole('dialog', { name: 'Thêm phiếu thu / chi', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Phiếu thu' }).click();
      await dialog.getByPlaceholder('VD: 500000').fill(String(amount));
      await expect(dialog.getByText(todayLabel(), { exact: false }).first()).toBeVisible();
      await dialog.locator('input[type="time"]').fill('09:30');
      await pickVoucherFund(page, dialog, fund.name);

      await dialog.locator('[aria-label="Mở danh sách"]').click();
      await page.getByRole('option', { name: categoryName }).click();

      await dialog.getByPlaceholder('VD: Thu tiền combo uốn & nhuộm HĐ #INV-001...').fill(
        description,
      );
      await dialog.getByRole('button', { name: 'Lưu phiếu' }).click();

      await expect(page.getByText('Tạo phiếu thành công', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      const created = await findCashflow(api, description);
      createdId = created.id;
      expect(created.status).toBe('pending');
      expect(created.kind).toBe('income');
      expect(created.amount).toBe(amount);

      await searchCashflow(page, created.code);
      const row = cashflowRow(page, created.code);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Chờ duyệt');
      await expect(row).toContainText(fund.name);
      await expect(row).toContainText(`+${vnd(amount)}`);

      expect((await getFund(api, fund.id)).current_balance).toBe(balanceBefore);
    } finally {
      if (createdId) await cancelCashflow(api, createdId);
      try {
        await api.delete(`/cashflow-categories/${category.id}`);
      } catch {}
      try {
        await api.delete(`/funds/${fund.id}`);
      } catch {}
    }
  });

  test('E2E-CFL-003 validate phiếu thu/chi', { tag: '@p0' }, async ({ page, api }) => {
    const fund = await createFund(api);
    const description = `Validate ${tag('CFL-003')}`;
    let postCount = 0;

    page.on('request', (request) => {
      if (request.method() !== 'POST') return;
      if (new URL(request.url()).pathname === '/api/v1/cashflows') postCount += 1;
    });

    try {
      await page.goto('/cashflow');
      await page.getByRole('button', { name: 'Thêm phiếu' }).click();
      const dialog = page.getByRole('dialog', { name: 'Thêm phiếu thu / chi', exact: true });
      await expect(dialog).toBeVisible();

      await dialog.getByPlaceholder('VD: 500000').fill('500000');
      await dialog.getByPlaceholder('VD: Thu tiền combo uốn & nhuộm HĐ #INV-001...').fill(
        description,
      );
      await dialog.getByRole('button', { name: 'Lưu phiếu' }).click();
      await expect(dialog.getByText('Vui lòng chọn quỹ hạch toán', { exact: true })).toBeVisible();

      await pickVoucherFund(page, dialog, fund.name);
      await dialog.getByPlaceholder('VD: 500000').fill('0');
      await dialog.getByRole('button', { name: 'Lưu phiếu' }).click();
      await expect(dialog.getByText('Số tiền phải lớn hơn 0', { exact: true })).toBeVisible();

      expect(postCount).toBe(0);
    } finally {
      try {
        await api.delete(`/funds/${fund.id}`);
      } catch {}
    }
  });

  test('E2E-CFL-004 duyệt phiếu cập nhật số dư quỹ', { tag: '@p1' }, async ({ page, api }) => {
    const fund = await createFund(api, { opening_balance: 20_000_000 });
    const incomeDesc = `Thu chờ duyệt ${tag('CFL-004')}`;
    const expenseDesc = `Chi chờ duyệt ${tag('CFL-004')}`;
    const income = await createCashFlow(api, { fund_id: fund.id }, {
      amount: 400_000,
      description: incomeDesc,
    });
    const expense = await createCashFlow(api, { fund_id: fund.id }, {
      kind: 'expense',
      amount: 250_000,
      description: expenseDesc,
    });

    try {
      const incomeRecord = await findCashflow(api, incomeDesc);
      const expenseRecord = await findCashflow(api, expenseDesc);
      const balanceBefore = (await getFund(api, fund.id)).current_balance;

      await page.goto('/cashflow');
      await searchCashflow(page, incomeRecord.code);
      const incomeRow = cashflowRow(page, incomeRecord.code);
      await expect(incomeRow).toContainText('Chờ duyệt');

      await page.getByTestId(`cashflow-approve-${incomeRecord.code}`).click();
      let dialog = page.getByRole('dialog', { name: 'Duyệt phiếu thu / chi', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(incomeRecord.code);
      await dialog.getByRole('button', { name: 'Duyệt phiếu' }).click();
      await expect(page.getByText('Duyệt phiếu thành công', { exact: true }).first()).toBeVisible();
      await expect(dialog).toBeHidden();
      await expect(incomeRow).toContainText('Đã duyệt');
      await expect
        .poll(async () => (await getFund(api, fund.id)).current_balance)
        .toBe(balanceBefore + 400_000);

      await searchCashflow(page, expenseRecord.code);
      const expenseRow = cashflowRow(page, expenseRecord.code);
      await expect(expenseRow).toContainText('Chờ duyệt');

      await page.getByTestId(`cashflow-approve-${expenseRecord.code}`).click();
      dialog = page.getByRole('dialog', { name: 'Duyệt phiếu thu / chi', exact: true });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(expenseRecord.code);
      await dialog.getByRole('button', { name: 'Duyệt phiếu' }).click();
      await expect(page.getByText('Duyệt phiếu thành công', { exact: true }).first()).toBeVisible();
      await expect(dialog).toBeHidden();
      await expect(expenseRow).toContainText('Đã duyệt');
      await expect
        .poll(async () => (await getFund(api, fund.id)).current_balance)
        .toBe(balanceBefore + 400_000 - 250_000);

      expect(income).toBeTruthy();
      expect(expense).toBeTruthy();
    } finally {
      try {
        await api.delete(`/funds/${fund.id}`);
      } catch {}
    }
  });

  test('E2E-CFL-005 tạo quỹ và validate', { tag: '@p0' }, async ({ page, api }) => {
    const duplicateCode = tag('QUY-DUP').toUpperCase();
    const duplicateFund = await createFund(api, {
      code: duplicateCode,
      name: `Quỹ trùng ${tag('CFL-005')}`,
    });
    const newCode = tag('QUY-NEW').toUpperCase();
    const newName = `Quỹ mới ${tag('CFL-005')}`;

    try {
      await page.goto('/cashflow');
      await page.getByTestId('cashflow-fund-settings').click();

      const dialog = page.getByRole('dialog', { name: 'Cài đặt quỹ', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Tạo quỹ mới' }).click();

      await dialog.getByPlaceholder('VD: CASH').fill(duplicateCode);
      await dialog.getByPlaceholder('VD: Tiền mặt tại quầy').fill(newName);
      await dialog.getByRole('button', { name: 'Lưu quỹ' }).click();
      await expect(dialog.getByText('Mã quỹ đã tồn tại', { exact: true })).toBeVisible();

      await dialog.getByPlaceholder('VD: CASH').fill(newCode);
      await dialog.getByPlaceholder('VD: Tiền mặt tại quầy').fill('   ');
      await dialog.getByRole('button', { name: 'Lưu quỹ' }).click();
      await expect(
        dialog.getByText('Tên quỹ không được để trống', { exact: true }),
      ).toBeVisible();

      await dialog.getByPlaceholder('VD: Tiền mặt tại quầy').fill(newName);
      const openingBalance = dialog.locator('form').locator('input[type="number"]').first();
      await openingBalance.fill('2500000');
      await dialog.getByRole('button', { name: 'Lưu quỹ' }).click();

      await expect(page.getByText('Tạo quỹ thành công', { exact: true })).toBeVisible();
      await expect(dialog.getByText(newName, { exact: true })).toBeVisible();
      await expect(dialog.getByText(vnd(2_500_000), { exact: true }).first()).toBeVisible();

      const created = await findFundByCode(api, newCode);
      expect(created).toBeTruthy();
    } finally {
      try {
        await api.delete(`/funds/${duplicateFund.id}`);
      } catch {}
      try {
        const created = await findFundByCode(api, newCode);
        if (created) await api.delete(`/funds/${created.id}`);
      } catch {}
    }
  });

  test('E2E-CFL-006 tìm kiếm, lọc và footer tổng', { tag: '@p0' }, async ({ page, api }) => {
    const fund = await createFund(api);
    const categoryName = `Danh mục thu ${tag('CFL-006')}`;
    const category = await createCashflowCategory(api, 'income', categoryName);
    const sharedTag = tag('CFL-006');
    const incomeDesc = `Thu lọc ${sharedTag}`;
    const expenseDesc = `Chi lọc ${sharedTag}`;
    const income = await createCashFlow(api, { fund_id: fund.id, category_id: category.id }, {
      amount: 600_000,
      description: incomeDesc,
    });
    const expense = await createCashFlow(api, { fund_id: fund.id }, {
      kind: 'expense',
      amount: 200_000,
      description: expenseDesc,
    });
    let incomeRecord: CashflowRecord | null = null;
    let expenseRecord: CashflowRecord | null = null;

    try {
      incomeRecord = await findCashflow(api, incomeDesc);
      expenseRecord = await findCashflow(api, expenseDesc);

      await page.goto('/cashflow');
      await searchCashflow(page, sharedTag);
      await expect(cashflowRow(page, incomeRecord.code)).toBeVisible();
      await expect(cashflowRow(page, expenseRecord.code)).toBeVisible();

      await expect(page.getByText('Tổng trang này:', { exact: true })).toBeVisible();
      await expect(page.getByText(`Thu: +${vnd(600_000)}`, { exact: true })).toBeVisible();
      await expect(page.getByText(`Chi: -${vnd(200_000)}`, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Chênh lệch ròng: +${vnd(400_000)}`, { exact: true }),
      ).toBeVisible();

      await pickFilter(page, 0, 'Phiếu Thu');
      await expect(page).toHaveURL(/[?&]kind=income/);
      await expect(cashflowRow(page, incomeRecord.code)).toBeVisible();
      await expect(cashflowRow(page, expenseRecord.code)).toBeHidden();
      await expect(page.getByText(`Thu: +${vnd(600_000)}`, { exact: true })).toBeVisible();
      await expect(page.getByText(`Chênh lệch ròng: +${vnd(600_000)}`, { exact: true })).toBeVisible();

      await pickFilter(page, 0, 'Phiếu Chi');
      await expect(page).toHaveURL(/[?&]kind=expense/);
      await expect(cashflowRow(page, expenseRecord.code)).toBeVisible();
      await expect(cashflowRow(page, incomeRecord.code)).toBeHidden();
      await expect(page.getByText(`Chi: -${vnd(200_000)}`, { exact: true })).toBeVisible();
      await expect(
        page.getByText(`Chênh lệch ròng: -${vnd(200_000)}`, { exact: true }),
      ).toBeVisible();

      await pickFilter(page, 0, 'Phiếu Thu');
      await pickFilter(page, 1, categoryName);
      await expect(page).toHaveURL(/[?&]category_id=/);
      await expect(cashflowRow(page, incomeRecord.code)).toBeVisible();

      await pickFilter(page, 2, 'Số tiền giảm dần');
      await expect(page).toHaveURL(/[?&]sort_by=amount_desc/);

      await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).click();
      await expect(page).toHaveURL(/\/cashflow(\?)?$/);
      expect(new URL(page.url()).pathname).toBe('/cashflow');
      expect(new URL(page.url()).search).toBe('');
      await expect(page.getByPlaceholder(SEARCH_PLACEHOLDER)).toHaveValue('');
    } finally {
      if (incomeRecord) await cancelCashflow(api, incomeRecord.id);
      if (expenseRecord) await cancelCashflow(api, expenseRecord.id);
      try {
        await api.delete(`/cashflow-categories/${category.id}`);
      } catch {}
      try {
        await api.delete(`/funds/${fund.id}`);
      } catch {}
      expect(income).toBeTruthy();
      expect(expense).toBeTruthy();
    }
  });
});
