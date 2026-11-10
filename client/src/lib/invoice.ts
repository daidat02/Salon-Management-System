import type { Order, OrderDetailPayment } from '@/types/order';
import type { OrganizationInfo, ReceiptSettings } from '@/types/setting';

export type InvoiceLine = {
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type InvoiceCustomer = {
  full_name?: string | null;
  phone?: string | null;
};

export type BuildInvoiceInput = {
  order: Order;
  lines: InvoiceLine[];
  payments?: OrderDetailPayment[];
  organization?: OrganizationInfo | null;
  receipt?: ReceiptSettings | null;
  customer?: InvoiceCustomer | null;
  cashierName?: string | null;
};

function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 3)}***${digits.slice(-3)}`;
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
  gateway: 'Cổng thanh toán',
  card: 'Thẻ',
};

function paperCss(paperSize: string | undefined): { width: string; pageSize: string } {
  switch (paperSize) {
    case 'K57':
      return { width: '54mm', pageSize: '57mm auto' };
    case 'A5':
      return { width: '140mm', pageSize: 'A5' };
    case 'K80':
    default:
      return { width: '76mm', pageSize: '80mm auto' };
  }
}

function renderInvoice(input: BuildInvoiceInput, copyIndex: number, totalCopies: number): string {
  const { order, lines, organization, receipt, customer } = input;
  const r = receipt ?? null;
  const orgName = organization?.name || 'Salon';
  const showLogo = !!r?.show_logo && !!r?.logo_url;
  const showAddress = r ? r.show_branch_address : true;
  const showCustomer = r ? r.show_customer_info : true;
  const maskCustomerPhone = r ? r.mask_customer_phone : false;
  const showWifi = !!r?.show_wifi_info && !!(r?.wifi_name || r?.wifi_pass);
  const showVietQR = !!r?.show_vietqr;
  const showCashier = !!r?.show_cashier_name && !!input.cashierName;

  const contactParts = [
    organization?.phone ? `Hotline: ${escapeHtml(organization.phone)}` : '',
    organization?.website ? escapeHtml(organization.website) : '',
    organization?.tax_code ? `MST: ${escapeHtml(organization.tax_code)}` : '',
  ].filter(Boolean);

  const headerText = r?.header_text ? `<p class="header-text">${escapeHtml(r.header_text)}</p>` : '';
  const footerText = r?.footer_text
    ? `<p class="footer-text">${escapeHtml(r.footer_text)}</p>`
    : '';

  const customerBlock = showCustomer
    ? `<div class="section customer">
        <div><span class="muted">Khách hàng:</span> ${escapeHtml(customer?.full_name) || 'Khách lẻ'}</div>
        ${
          customer?.phone
            ? `<div><span class="muted">SĐT:</span> ${
                maskCustomerPhone
                  ? escapeHtml(maskPhone(customer.phone))
                  : escapeHtml(customer.phone)
              }</div>`
            : ''
        }
      </div>`
    : '';

  const rows = lines
    .map(
      (line) => `<tr>
        <td class="name">${escapeHtml(line.name)}</td>
        <td class="num">${line.quantity}</td>
        <td class="num">${money(line.unit_price)}</td>
        <td class="num">${money(line.line_total)}</td>
      </tr>`,
    )
    .join('');

  const paymentText =
    input.payments && input.payments.length > 0
      ? input.payments
          .map((p) => `${PAYMENT_LABEL[p.method] ?? p.method}: ${money(p.amount)}`)
          .join(' • ')
      : '';

  const vietqrBlock = showVietQR
    ? `<div class="vietqr">
        <div class="qr-box">
          <span>VIET<br/>QR</span>
        </div>
        <div>
          <div class="bold">Quét VietQR để thanh toán</div>
          <div class="muted">Nội dung: ${escapeHtml(order.code)}</div>
          <div class="bold">${money(order.total_amount)}</div>
        </div>
      </div>`
    : '';

  const wifiBlock = showWifi
    ? `<div class="section wifi">
        <div class="bold">Wi-Fi</div>
        ${r?.wifi_name ? `<div>Tên: ${escapeHtml(r.wifi_name)}</div>` : ''}
        ${r?.wifi_pass ? `<div>Mật khẩu: ${escapeHtml(r.wifi_pass)}</div>` : ''}
      </div>`
    : '';

  return `<section class="invoice${copyIndex < totalCopies - 1 ? ' page-break' : ''}">
    <header>
      ${showLogo ? `<img class="logo" src="${escapeHtml(r?.logo_url)}" alt="Logo" />` : ''}
      <h1>${escapeHtml(orgName)}</h1>
      ${organization?.slogan ? `<p class="slogan">${escapeHtml(organization.slogan)}</p>` : ''}
      ${
        showAddress && organization?.address
          ? `<p class="muted">${escapeHtml(organization.address)}</p>`
          : ''
      }
      ${contactParts.length > 0 ? `<p class="muted">${contactParts.join(' • ')}</p>` : ''}
      ${headerText}
    </header>
    <h2>HÓA ĐƠN THANH TOÁN</h2>
    <div class="meta">
      <span>Số: <span class="bold">${escapeHtml(order.code)}</span></span>
      ${order.created_at ? `<span>${escapeHtml(formatDate(order.created_at))}</span>` : ''}
    </div>
    ${customerBlock}
    <table>
      <thead>
        <tr>
          <th>Tên</th>
          <th class="num">SL</th>
          <th class="num">Đơn giá</th>
          <th class="num">T.Tiền</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted">Chưa có dòng hàng.</td></tr>'}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Tạm tính</span><span>${money(order.subtotal_amount)}</span></div>
      ${
        order.discount_amount > 0
          ? `<div class="row"><span>Giảm giá</span><span>-${money(order.discount_amount)}</span></div>`
          : ''
      }
      <div class="row grand"><span>Tổng cộng</span><span>${money(order.total_amount)}</span></div>
      ${paymentText ? `<div class="row muted"><span>Thanh toán</span><span>${escapeHtml(paymentText)}</span></div>` : ''}
    </div>
    ${vietqrBlock}
    ${wifiBlock}
    ${showCashier ? `<p class="muted">Thu ngân: ${escapeHtml(input.cashierName)}</p>` : ''}
    ${footerText}
    <p class="thanks">Cảm ơn quý khách và hẹn gặp lại!</p>
  </section>`;
}

export function buildInvoiceHtml(input: BuildInvoiceInput): string {
  const { width, pageSize } = paperCss(input.receipt?.paper_size);
  const copies = Math.min(Math.max(input.receipt?.print_copy_count ?? 1, 1), 5);
  const body = Array.from({ length: copies }, (_, index) =>
    renderInvoice(input, index, copies),
  ).join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>Hóa đơn ${escapeHtml(input.order.code)}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 11px;
    line-height: 1.4;
  }
  .invoice { width: ${width}; margin: 0 auto; padding: 4mm 0; }
  .invoice.page-break { break-after: page; page-break-after: always; }
  header { text-align: center; margin-bottom: 6px; }
  .logo { max-width: 48mm; max-height: 20mm; object-fit: contain; margin-bottom: 4px; }
  h1 { font-size: 15px; margin: 2px 0; text-transform: uppercase; }
  h2 { font-size: 12px; margin: 8px 0 4px; text-align: center; letter-spacing: 0.5px; }
  .slogan { margin: 1px 0 2px; font-style: italic; }
  .muted { color: #555; }
  .bold { font-weight: 700; }
  .header-text { margin: 3px 0 0; white-space: pre-line; }
  .meta { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
  .section { border-top: 1px dashed #999; padding: 4px 0; margin: 4px 0; }
  .customer div { margin: 1px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { padding: 3px 2px; vertical-align: top; }
  th { border-bottom: 1px solid #333; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { border-bottom: 1px dotted #ccc; }
  .num { text-align: right; white-space: nowrap; }
  td.name { width: 45%; word-break: break-word; }
  .totals { margin-top: 5px; border-top: 1px solid #333; padding-top: 4px; }
  .totals .row { display: flex; justify-content: space-between; gap: 8px; margin: 1px 0; }
  .totals .grand { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .vietqr {
    display: flex; align-items: center; gap: 8px;
    border: 1px solid #999; border-radius: 4px; padding: 5px; margin-top: 6px;
    break-inside: avoid;
  }
  .qr-box {
    width: 18mm; height: 18mm; flex: 0 0 auto;
    border: 1px dashed #666; display: flex; align-items: center; justify-content: center;
    text-align: center; font-weight: 700; font-size: 9px;
  }
  .wifi { break-inside: avoid; }
  .footer-text { margin-top: 6px; text-align: center; white-space: pre-line; }
  .thanks { margin-top: 8px; text-align: center; font-weight: 600; }
  @media print {
    @page { size: ${pageSize}; margin: 4mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${body}
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.print(); }, 150);
  });
</script>
</body>
</html>`;
}

/** Mở cửa sổ in mới. Trả false nếu trình duyệt chặn popup. */
export function printInvoice(input: BuildInvoiceInput): boolean {
  const win = window.open('', '_blank', 'width=420,height=720');
  if (!win) return false;
  win.document.open();
  win.document.write(buildInvoiceHtml(input));
  win.document.close();
  win.focus();
  return true;
}
