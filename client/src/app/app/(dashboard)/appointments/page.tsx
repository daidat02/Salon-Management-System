import type { Metadata } from 'next';
import { FileDown, Plus } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import DashToolbar from '@/components/dashboard/DashToolbar';
import AppointmentsView from './components/AppointmentsView';
import AppointmentsStats from './components/AppointmentsStats';

export const metadata: Metadata = { title: 'Lịch hẹn | SALON ADMIN' };

export default function AppointmentsPage() {
  return (
    <div className="space-y-4">
      <PageHeading
        breadcrumbs={[
          { label: 'Trang chủ', href: '#' },
          { label: 'Lịch hẹn', active: true },
        ]}
        title="Lịch hẹn"
        subtitle="Quản lý lịch hẹn, phân công kỹ thuật viên và theo dõi trạng thái phục vụ"
        actions={[
          { label: 'Xuất Excel / CSV', icon: FileDown, variant: 'outline' },
          { label: 'Đặt lịch mới', icon: Plus, variant: 'primary' },
        ]}
      />
      <AppointmentsStats />
      <DashToolbar
        searchPlaceholder="Tìm theo tên, SĐT, mã lịch..."
        filters={[
          {
            id: 'status',
            placeholder: 'Tất cả trạng thái',
            widthClass: 'sm:w-44',
            options: [
              'Tất cả trạng thái',
              'Chờ xác nhận',
              'Đã xác nhận',
              'Đang phục vụ',
              'Đã hoàn thành',
              'Đã hủy',
            ],
          },
          {
            id: 'staff',
            placeholder: 'Tất cả nhân viên',
            widthClass: 'sm:w-40',
            options: [
              'Tất cả nhân viên',
              'Hương Stylist',
              'Tuấn Stylist',
              'Linh Barber',
              'Ngọc Spa',
              'Trang Eyelash',
            ],
          },
          {
            id: 'service',
            placeholder: 'Tất cả dịch vụ',
            widthClass: 'sm:w-44',
            options: [
              'Tất cả dịch vụ',
              'Cắt & Tạo kiểu',
              'Nhuộm & Phục hồi',
              'Uốn & Duỗi',
              'Gội & Dưỡng sinh',
            ],
          },
        ]}
      />
      <AppointmentsView />
    </div>
  );
}
