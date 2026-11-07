import PageHeading from '@/components/dashboard/PageHeading';
import SettingsNav from './components/SettingsNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <PageHeading
        title="Cài đặt salon"
        subtitle="Cấu hình thông tin cửa hàng, lịch hẹn, thanh toán, quỹ tiền và các tự động hóa."
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <aside className="min-w-0 lg:col-span-3">
          <SettingsNav />
        </aside>
        <div className="min-w-0 lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
