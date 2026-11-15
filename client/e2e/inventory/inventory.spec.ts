import type { Locator, Page } from '@playwright/test';
import { expect, roleStorageState, test } from '../fixtures/test';
import { injectAccessToken } from '../support/auth';
import type { ApiClient } from '../support/api';
import {
  createCategory,
  createFund,
  createInventoryDocument,
  createProduct,
  createSupplier,
  tag,
} from '../support/data';

const PRODUCT_SEARCH_PLACEHOLDER =
  'Quét mã vạch hoặc nhập tìm thuốc nhuộm, dầu gội, oxy, tinh dầu dưỡng...';
const INVENTORY_SEARCH_PLACEHOLDER = 'Tìm theo tên SP, SKU, vị trí kệ...';
const HISTORY_SEARCH_PLACEHOLDER = 'Tìm theo mã phiếu, NCC, đơn hàng...';

type ProductListItem = {
  id: string;
  sku: string;
  name: string;
  stock_quantity: number;
};

type InventoryDocumentDetail = {
  document: { id: string; document_code: string; payment_status: string; remaining_amount: number };
  payments: { id: string; code: string; amount: number }[];
};

function futureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function vnd(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

async function getProductBySku(api: ApiClient, sku: string): Promise<ProductListItem> {
  const list = await api.get<{ data: ProductListItem[] }>('/products', {
    search: sku,
    page: 1,
    page_size: 20,
  });
  const product = list.data.find((item) => item.sku === sku);
  expect(product).toBeTruthy();
  return product as ProductListItem;
}

async function getStockBySku(api: ApiClient, sku: string): Promise<number> {
  return (await getProductBySku(api, sku)).stock_quantity;
}

async function getDocumentDetail(
  api: ApiClient,
  id: string,
): Promise<InventoryDocumentDetail> {
  return api.get<InventoryDocumentDetail>(`/inventory/${id}`);
}

async function searchInventory(page: Page, query: string): Promise<void> {
  await page.getByPlaceholder(INVENTORY_SEARCH_PLACEHOLDER).fill(query);
  await expect(page).toHaveURL(/[?&]search=/);
}

async function pickToolbarFilter(
  page: Page,
  root: Locator,
  index: number,
  label: string,
): Promise<void> {
  await root.locator('[data-slot="select-trigger"]').nth(index).click();
  await page.locator('[data-slot="select-item"]').filter({ hasText: label }).first().click();
}

function voucherRow(page: Page, productId: string): Locator {
  return page.getByRole('row').filter({
    has: page.locator(`[data-testid="voucher-qty-${productId}"]`),
  });
}

async function addVoucherProduct(page: Page, productId: string, productName: string) {
  await page.getByPlaceholder(PRODUCT_SEARCH_PLACEHOLDER).fill(productName);
  const suggestion = page
    .getByRole('button')
    .filter({ hasText: productName })
    .filter({ hasText: 'SKU:' })
    .first();
  await expect(suggestion).toBeVisible();
  await suggestion.click();

  const row = voucherRow(page, productId);
  await expect(row).toBeVisible();
  return row;
}

async function clickComplete(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: label }).first().click();
}

function submitError(page: Page, message: string): Locator {
  return page.getByText(message, { exact: true }).first();
}

function countInventoryPosts(page: Page): () => number {
  let count = 0;
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    if (new URL(request.url()).pathname === '/api/v1/inventory') count += 1;
  });
  return () => count;
}

test.describe('E2E-INV inventory', () => {
  test.use({ storageState: roleStorageState('owner') });

  test.beforeEach(async ({ page }) => {
    await injectAccessToken(page, 'owner');
  });

  test(
    'E2E-INV-001 danh sách tồn kho, stats và bộ lọc',
    { tag: ['@smoke', '@p0'] },
    async ({ page, api }) => {
      const categoryName = `Danh mục ${tag('INV-001')}`;
      const category = await createCategory(api, 'product', categoryName);
      const productName = `Sản phẩm ${tag('INV-001')}`;
      const product = await createProduct(api, {
        name: productName,
        category_id: category.id,
        stock_quantity: 20,
      });

      try {
        await page.goto('/inventory');
        await expect(page.getByRole('heading', { level: 1, name: 'Kho Hàng' })).toBeVisible();

        for (const label of [
          'Tổng SKU',
          'Sắp hết hàng',
          'Tổng giá trị tồn kho',
          'Chi phí nhập tháng này',
        ]) {
          await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
        }

        for (const header of [
          'Mã SKU',
          'Sản phẩm & Quy cách',
          'Danh mục',
          'Tồn kho & Mức an toàn',
          'Giá nhập',
          'Giá niêm yết',
          'Trạng thái',
        ]) {
          await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
        }

        await searchInventory(page, product.sku);
        const row = page.getByRole('row').filter({ hasText: product.sku });
        await expect(row).toBeVisible();
        await expect(row).toContainText(productName);
        await expect(row).toContainText(categoryName);

        const catalog = page.locator('main');
        await pickToolbarFilter(page, catalog, 0, categoryName);
        await expect(page).toHaveURL(/[?&]category_id=/);
        await expect(page.getByRole('row').filter({ hasText: product.sku })).toBeVisible();

        await pickToolbarFilter(page, catalog, 1, 'Còn hàng an toàn');
        await expect(page).toHaveURL(/[?&]status=active/);
        await expect(page.getByRole('row').filter({ hasText: product.sku })).toBeVisible();

        await pickToolbarFilter(page, catalog, 2, 'Giá tăng dần');
        await expect(page).toHaveURL(/[?&]sort=price_asc/);
        await expect(page.getByRole('row').filter({ hasText: product.sku })).toBeVisible();

        await page.getByRole('button', { name: 'Đặt lại bộ lọc' }).first().click();
        await expect(page).toHaveURL(/\/inventory(\?)?$/);
        expect(new URL(page.url()).pathname).toBe('/inventory');
        expect(new URL(page.url()).search).toBe('');
        await expect(page.getByPlaceholder(INVENTORY_SEARCH_PLACEHOLDER)).toHaveValue('');

        await page.getByRole('link', { name: 'Xem lịch sử' }).click();
        await expect(page.locator('#inventory-history')).toBeInViewport();
      } finally {
        try {
          await api.delete(`/products/${product.id}`);
        } catch {}
        try {
          await api.delete(`/categories/${category.id}`);
        } catch {}
      }
    },
  );

  test('E2E-INV-002 lịch sử phiếu nhập / xuất kho', { tag: '@p1' }, async ({ page, api }) => {
    const productName = `Sản phẩm ${tag('INV-002')}`;
    const product = await createProduct(api, { name: productName });
    const supplier = await createSupplier(api);
    const fund = await createFund(api);
    const document = await createInventoryDocument(
      api,
      { product_id: product.id, supplier_id: supplier.id, fund_id: fund.id },
      {
        paid_amount: 100_000,
        due_date: futureDate(7),
      },
    );

    try {
      await page.goto('/inventory');
      const history = page.locator('#inventory-history');
      await expect(
        history.getByRole('heading', { name: 'Lịch sử phiếu nhập / xuất kho' }),
      ).toBeVisible();

      await history.getByPlaceholder(HISTORY_SEARCH_PLACEHOLDER).fill(document.document_code);
      await expect(page).toHaveURL(/[?&]hsearch=/);

      const historyRow = history.getByRole('row').filter({ hasText: document.document_code });
      await expect(historyRow).toBeVisible();
      await expect(historyRow).toContainText(supplier.name);

      await pickToolbarFilter(page, history, 0, 'Phiếu nhập');
      await expect(page).toHaveURL(/[?&]hfilter=import/);
      await expect(historyRow).toBeVisible();

      await pickToolbarFilter(page, history, 0, 'Phiếu xuất');
      await expect(page).toHaveURL(/[?&]hfilter=export/);
      await expect(historyRow).toBeHidden();

      await pickToolbarFilter(page, history, 0, 'Phiếu nhập');
      await expect(historyRow).toBeVisible();

      await pickToolbarFilter(page, history, 1, 'Trả một phần');
      await expect(page).toHaveURL(/[?&]hpayment=partial/);
      await expect(historyRow).toContainText('Trả một phần');

      await pickToolbarFilter(page, history, 1, 'Tất cả công nợ');
      await expect(page).not.toHaveURL(/[?&]hpayment=/);
      await expect(historyRow).toBeVisible();

      await historyRow.getByRole('link', { name: document.document_code }).click();
      await expect(page).toHaveURL(new RegExp(`/inventory/${document.id}$`));
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `Chi tiết Phiếu nhập ${document.document_code}`,
        }),
      ).toBeVisible();
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });

  test(
    'E2E-INV-003 tạo phiếu nhập làm tăng tồn kho',
    { tag: ['@smoke', '@p0'] },
    async ({ page, api }) => {
      const productName = `Sản phẩm ${tag('INV-003')}`;
      const product = await createProduct(api, { name: productName, stock_quantity: 10 });
      const supplier = await createSupplier(api);
      const fund = await createFund(api);
      const code = tag('PN-INV-003');
      const stockBefore = await getStockBySku(api, product.sku);

      try {
        await page.goto('/inventory/inbound');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Tạo Phiếu Nhập Kho' }),
        ).toBeVisible();

        await page.getByPlaceholder('Nhập mã phiếu kho...').fill(code);

        await page
          .locator('[data-slot="select-trigger"]')
          .filter({ hasText: 'Nhập hàng định kỳ từ Nhà Cung Cấp' })
          .click();
        await page
          .locator('[data-slot="select-item"]')
          .filter({ hasText: 'Nhập bổ sung đơn hàng khẩn cấp' })
          .first()
          .click();

        await page
          .locator('[data-slot="select-trigger"]')
          .filter({ hasText: 'Chọn nhà cung cấp / nhãn hàng' })
          .click();
        await page
          .locator('[data-slot="select-item"]')
          .filter({ hasText: supplier.name })
          .first()
          .click();

        const row = await addVoucherProduct(page, product.id, productName);
        await page.getByTestId(`voucher-qty-${product.id}`).fill('2');
        const lineInputs = row.locator('input[type="number"]');
        await lineInputs.nth(1).fill('60000');
        await lineInputs.nth(2).fill('10');

        const paymentCard = page
          .locator('section')
          .filter({ has: page.getByRole('heading', { name: 'Thanh toán & Chứng từ' }) });
        await paymentCard.locator('input[type="number"]').first().fill('50000');

        await paymentCard.locator('[data-slot="select-trigger"]').first().click();
        await page
          .locator('[data-slot="select-item"]')
          .filter({ hasText: fund.name })
          .first()
          .click();

        await clickComplete(page, 'Hoàn tất & Nhập kho');

        await expect(page.getByText('Tạo phiếu thành công', { exact: true })).toBeVisible();
        await expect(page).toHaveURL(/\/inventory(\?)?$/);
        expect(new URL(page.url()).pathname).toBe('/inventory');

        await expect
          .poll(() => getStockBySku(api, product.sku))
          .toBe(stockBefore + 2_000);
      } finally {
        try {
          await api.delete(`/products/${product.id}`);
        } catch {}
      }
    },
  );

  test('E2E-INV-004 validate phiếu nhập', { tag: '@p0' }, async ({ page, api }) => {
    const productName = `Sản phẩm ${tag('INV-004')}`;
    const product = await createProduct(api, { name: productName });

    await page.route('**/api/v1/funds**', (route) =>
      route.fulfill({ json: { data: [] } }),
    );

    try {
      await page.goto('/inventory/inbound');
      const postCount = countInventoryPosts(page);

      await clickComplete(page, 'Hoàn tất & Nhập kho');
      await expect(
        submitError(page, 'Vui lòng thêm ít nhất 1 sản phẩm vào phiếu'),
      ).toBeVisible();

      const row = await addVoucherProduct(page, product.id, productName);

      await clickComplete(page, 'Hoàn tất & Nhập kho');
      await expect(submitError(page, 'Vui lòng nhập mã chứng từ')).toBeVisible();

      await page.getByPlaceholder('Nhập mã phiếu kho...').fill(tag('PN-INV-004'));
      await page.getByTestId(`voucher-qty-${product.id}`).fill('0');
      await clickComplete(page, 'Hoàn tất & Nhập kho');
      await expect(
        submitError(page, 'Số lượng mỗi dòng phải lớn hơn 0'),
      ).toBeVisible();

      await page.getByTestId(`voucher-qty-${product.id}`).fill('1');

      const paymentCard = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'Thanh toán & Chứng từ' }) });
      const paidInput = paymentCard.locator('input[type="number"]').first();

      await paidInput.fill('1000000');
      await clickComplete(page, 'Hoàn tất & Nhập kho');
      await expect(
        submitError(page, 'Số tiền đã trả không được vượt quá tổng thanh toán'),
      ).toBeVisible();

      await paidInput.fill('1000');
      await clickComplete(page, 'Hoàn tất & Nhập kho');
      await expect(submitError(page, 'Vui lòng chọn quỹ thanh toán')).toBeVisible();

      expect(postCount()).toBe(0);
      await expect(row).toBeVisible();
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });

  test(
    'E2E-INV-005 tạo phiếu xuất làm giảm tồn kho',
    { tag: ['@smoke', '@p0'] },
    async ({ page, api }) => {
      const productName = `Sản phẩm ${tag('INV-005')}`;
      const product = await createProduct(api, { name: productName, stock_quantity: 5 });
      const stockBefore = await getStockBySku(api, product.sku);

      try {
        await page.goto('/inventory/outbound');
        await expect(
          page.getByRole('heading', { level: 1, name: 'Tạo Phiếu Xuất Kho' }),
        ).toBeVisible();

        await page.getByPlaceholder('Nhập mã phiếu kho...').fill(tag('PX-INV-005'));

        await page
          .locator('[data-slot="select-trigger"]')
          .filter({ hasText: 'Xuất cho Stylist làm dịch vụ' })
          .click();
        await page
          .locator('[data-slot="select-item"]')
          .filter({ hasText: 'Bán lẻ tại quầy POS' })
          .first()
          .click();

        await addVoucherProduct(page, product.id, productName);
        await page.getByTestId(`voucher-qty-${product.id}`).fill('2');

        await clickComplete(page, 'Hoàn tất & Xuất kho');

        await expect(page.getByText('Tạo phiếu thành công', { exact: true })).toBeVisible();
        await expect(page).toHaveURL(/\/inventory(\?)?$/);

        await expect
          .poll(() => getStockBySku(api, product.sku))
          .toBe(stockBefore - 2_000);
      } finally {
        try {
          await api.delete(`/products/${product.id}`);
        } catch {}
      }
    },
  );

  test('E2E-INV-006 chặn xuất vượt tồn kho', { tag: '@p0' }, async ({ page, api }) => {
    const productName = `Sản phẩm ${tag('INV-006')}`;
    const product = await createProduct(api, { name: productName, stock_quantity: 2 });
    const stockBefore = await getStockBySku(api, product.sku);

    try {
      await page.goto('/inventory/outbound');
      const postCount = countInventoryPosts(page);

      await page.getByPlaceholder('Nhập mã phiếu kho...').fill(tag('PX-INV-006'));
      const row = await addVoucherProduct(page, product.id, productName);
      await page.getByTestId(`voucher-qty-${product.id}`).fill('3');

      await expect(row.getByText('Tồn: 2.000 ml', { exact: true })).toBeVisible();
      await expect(page.getByTestId(`voucher-qty-${product.id}`)).toHaveClass(/text-error/);

      await clickComplete(page, 'Hoàn tất & Xuất kho');

      await expect(
        submitError(page, `Phiếu xuất vượt tồn kho: ${productName} (tồn 2.000 ml)`),
      ).toBeVisible();
      await expect(page.getByText('Vượt tồn kho', { exact: true })).toBeVisible();
      expect(postCount()).toBe(0);
      expect(await getStockBySku(api, product.sku)).toBe(stockBefore);
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });

  test('E2E-INV-007 chi tiết phiếu nhập và công nợ', { tag: '@p1' }, async ({ page, api }) => {
    const productName = `Sản phẩm ${tag('INV-007')}`;
    const product = await createProduct(api, { name: productName });
    const supplier = await createSupplier(api);
    const fund = await createFund(api);
    const dueDate = futureDate(7);
    const document = await createInventoryDocument(
      api,
      { product_id: product.id, supplier_id: supplier.id, fund_id: fund.id },
      { paid_amount: 200_000, due_date: dueDate },
    );

    try {
      const detail = await getDocumentDetail(api, document.id);
      expect(detail.payments).toHaveLength(1);

      await page.goto(`/inventory/${document.id}`);
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: `Chi tiết Phiếu nhập ${document.document_code}`,
        }),
      ).toBeVisible();
      await expect(page.getByText('1. Thông tin phiếu kho', { exact: true })).toBeVisible();
      await expect(page.getByText('2. Danh mục sản phẩm & Vật tư', { exact: true })).toBeVisible();
      await expect(page.getByText('Hạch toán tài chính', { exact: true })).toBeVisible();
      await expect(page.getByText(productName, { exact: true })).toBeVisible();
      await expect(page.getByText(supplier.name, { exact: true })).toBeVisible();

      await expect(page.getByText('Công nợ nhà cung cấp', { exact: true })).toBeVisible();
      await expect(page.getByText('Thanh toán một phần', { exact: true })).toBeVisible();
      await expect(page.getByText('Tổng phải trả', { exact: true })).toBeVisible();
      await expect(page.getByText('Đã trả', { exact: true })).toBeVisible();
      await expect(page.getByText('Còn nợ', { exact: true })).toBeVisible();
      await expect(page.getByText('Hạn thanh toán', { exact: true })).toBeVisible();
      await expect(page.getByText(dueDate, { exact: true })).toBeVisible();
      await expect(page.getByText(vnd(200_000), { exact: true }).first()).toBeVisible();
      await expect(page.getByText(vnd(300_000), { exact: true }).first()).toBeVisible();

      await expect(page.getByText('Lịch sử thanh toán', { exact: true })).toBeVisible();
      await expect(page.getByText(detail.payments[0].code, { exact: true })).toBeVisible();
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });

  test('E2E-INV-008 thanh toán công nợ', { tag: '@p0' }, async ({ page, api }) => {
    const productName = `Sản phẩm ${tag('INV-008')}`;
    const product = await createProduct(api, { name: productName });
    const supplier = await createSupplier(api);
    const fund = await createFund(api);
    const document = await createInventoryDocument(
      api,
      { product_id: product.id, supplier_id: supplier.id, fund_id: fund.id },
      { paid_amount: 100_000, due_date: futureDate(7) },
    );

    try {
      const before = await getDocumentDetail(api, document.id);
      const remaining = before.document.remaining_amount;

      await page.goto(`/inventory/${document.id}`);
      await expect(page.getByText('Công nợ nhà cung cấp', { exact: true })).toBeVisible();

      await page.route('**/api/v1/funds**', (route) =>
        route.fulfill({ json: { data: [] } }),
      );
      await page.getByRole('button', { name: 'Thanh toán công nợ' }).click();
      let dialog = page.getByRole('dialog', { name: 'Thanh toán công nợ', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
      await expect(
        dialog.getByText('Vui lòng chọn quỹ thanh toán', { exact: true }),
      ).toBeVisible();
      await dialog.getByRole('button', { name: 'Hủy' }).click();
      await expect(dialog).toBeHidden();

      await page.unroute('**/api/v1/funds**');
      await page.reload();
      await expect(page.getByText('Công nợ nhà cung cấp', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Thanh toán công nợ' }).click();
      dialog = page.getByRole('dialog', { name: 'Thanh toán công nợ', exact: true });
      await expect(dialog).toBeVisible();

      const amountInput = dialog.locator('input[type="number"]').first();
      await amountInput.fill(String(remaining + 1000));
      await dialog.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
      await expect(
        dialog.getByText('Số tiền trả vượt quá số còn nợ', { exact: true }),
      ).toBeVisible();

      await dialog.getByRole('button', { name: 'Trả hết' }).click();
      await dialog.locator('[data-slot="select-trigger"]').click();
      await page
        .locator('[data-slot="select-item"]')
        .filter({ hasText: fund.name })
        .first()
        .click();

      await dialog.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
      await expect(page.getByText('Đã ghi nhận thanh toán', { exact: true })).toBeVisible();
      await expect(dialog).toBeHidden();

      await expect(page.getByText('Đã thanh toán đủ', { exact: true })).toBeVisible();

      await expect
        .poll(async () => (await getDocumentDetail(api, document.id)).document.payment_status)
        .toBe('paid');
      const after = await getDocumentDetail(api, document.id);
      expect(after.document.remaining_amount).toBe(0);
      expect(after.payments).toHaveLength(before.payments.length + 1);
      await expect(page.getByText(after.payments[0].code, { exact: true })).toBeVisible();
    } finally {
      try {
        await api.delete(`/products/${product.id}`);
      } catch {}
    }
  });
});
