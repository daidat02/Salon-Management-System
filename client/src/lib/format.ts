/** Tiền VNĐ kèm đơn vị đ, vd. 150000 -> "150.000 đ". */
export function formatVND(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

/** Số thuần theo locale, vd. 150000 -> "150.000" (không kèm đơn vị). */
export function formatPlain(n: number): string {
  return n.toLocaleString('vi-VN');
}

/** Ngày giờ locale ngắn, null -> "—". */
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/** Giờ + ngày gọn "HH:mm dd/MM", sai format thì trả nguyên chuỗi. */
export function formatShortDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${hh}:${mm} ${dd}/${mo}`;
}

/**
 * Chuyển Date object thành chuỗi 'YYYY-MM-DD' theo đúng ngày hiển thị địa phương (múi giờ VN)
 * Tránh việc .toISOString() bị trôi lùi 1 ngày do lệch múi giờ UTC.
 */
export const formatLocalDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
  // 'en-CA' tự động trả về định dạng chuẩn YYYY-MM-DD
};

/**
 * Đọc chuỗi 'YYYY-MM-DD' từ URL ngược lại thành Date object chuẩn Local Time
 */
export const parseLocalDate = (dateStr: string | null): Date | undefined => {
  if (!dateStr) return undefined;
  // Ghép 'T00:00:00' để JS parse theo giờ địa phương, không bị nhảy sang UTC
  const date = new Date(`${dateStr}T00:00:00`);
  return isNaN(date.getTime()) ? undefined : date;
};

export const formatStockQuantity = (
  quantity: number,
  netAmount?: number,
  unit?: string,
): string => {
  if (quantity === 0) return 'Hết hàng';
  if (netAmount && netAmount > 0) {
    return `${quantity / netAmount} ${unit ?? ''}`;
  }
  return `${quantity} ${unit ?? ''}`;
};
