import { Tag } from '@/components/ui/tag';
import type { DashColumn } from '@/components/dashboard/DashTable';
import type { Service } from '@/types/service';

export const serviceColumns: DashColumn<Service>[] = [
  {
    id: 'name',
    header: 'Tên dịch vụ & Mô tả',
    className: 'min-w-[260px]',
    cell: (row) => (
      <div>
        <div className="font-semibold text-on-surface">{row.name}</div>
        <div className="text-[11px] text-on-surface-variant line-clamp-1">
          {row.description || '—'}
        </div>
      </div>
    ),
  },
  {
    id: 'category',
    header: 'Danh mục',
    className: 'min-w-[120px] ',
    cell: (row) => row.category_name || 'Chưa phân loại',
  },
  {
    id: 'duration',
    header: 'Thời lượng',
    className: 'text-center',
    cell: (row) => (
      <Tag variant="slate" size="sm" shape="rounded">
        {row.duration_minutes} phút
      </Tag>
    ),
  },
  {
    id: 'price',
    header: 'Đơn giá',
    className: 'text-right font-medium min-w-[100px]',
    cell: (row) => `${Number(row.price).toLocaleString('vi-VN')} đ`,
  },
  {
    id: 'sold_this_month',
    header: 'Số lượng/Tháng',
    className: 'text-center',
    cell: (row) => `${Math.round(Number(row.sold_this_month))} lượt`,
  },

  {
    id: 'revenue_this_month',
    header: 'Doanh thu tháng',
    className: 'text-right font-medium min-w-[100px]',
    cell: (row) => `${Number(row.revenue_this_month).toLocaleString('vi-VN')} đ`,
  },
  {
    id: 'status',
    header: 'Trạng thái',
    className: 'text-center',
    cell: (row) => (
      <Tag variant={row.is_active ? 'success' : 'warning'} shape="pill" size="md" dot>
        {row.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}
      </Tag>
    ),
  },
  {
    id: 'updated_at',
    header: 'Cập nhật lần cuối',
    className: 'text-center',
    cell: (row) =>
      new Date(row.updated_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
  },
];
