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
