import {
  Archive,
  Calendar,
  ChartColumn,
  LayoutDashboard,
  Package,
  ShoppingCart,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/Logo';

const NAV = [
  { label: 'Tổng quan', icon: LayoutDashboard, active: true },
  { label: 'Thu ngân', icon: ShoppingCart },
  { label: 'Lịch hẹn', icon: Calendar },
  { label: 'Sản phẩm', icon: Package },
  { label: 'Kho hàng', icon: Archive },
  { label: 'Thu & Chi', icon: Wallet },
  { label: 'Báo cáo', icon: ChartColumn },
];

const KPI = [
  { label: 'Doanh thu hôm nay', value: '3.420.000đ', note: '▲ 12,5%', tone: 'text-success' },
  { label: 'Đơn hàng', value: '28', note: '▲ 8,2%', tone: 'text-success' },
  { label: 'Lịch hẹn', value: '14', note: '3 đang phục vụ', tone: 'text-brand' },
  { label: 'Khách mới', value: '6', note: '2 cần gọi lại', tone: 'text-warning' },
];

export default function HeroDashboardMock() {
  return (
    <div className="rounded-xl2 border border-line bg-white p-2.5 shadow-lift">
      <div className="overflow-hidden rounded-custom border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-canvas px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          <span className="ml-2 flex-1 rounded-md bg-white px-2 py-1 text-[10px] text-muted">
            app.vietops.vn/overview
          </span>
        </div>

        <div className="flex bg-white">
          <aside className="hidden w-[118px] shrink-0 border-r border-line bg-white p-2.5 sm:block">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand text-white">
                <LogoMark />
              </span>
              <span className="font-display text-[10px] font-extrabold text-ink">VietOps</span>
            </div>
            <div className="space-y-1 text-[9px] font-medium text-muted">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className={
                      item.active
                        ? 'flex items-center gap-1.5 rounded-md bg-brand-light px-2 py-1.5 text-brand'
                        : 'flex items-center gap-1.5 px-2 py-1.5'
                    }
                  >
                    <Icon className="h-3 w-3" />
                    {item.label}
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="mock-scroll min-w-0 flex-1 space-y-3 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-ink">Tổng quan hôm nay</div>
                <div className="text-[8.5px] text-muted">Thứ Sáu, 20/11/2026</div>
              </div>
              <span className="rounded-md bg-brand px-2 py-1 text-[8.5px] font-semibold text-white">
                + Tạo đơn
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {KPI.map((kpi) => (
                <div key={kpi.label} className="rounded-lg border border-line p-2">
                  <div className="text-[8px] text-muted">{kpi.label}</div>
                  <div className="mt-0.5 text-[13px] font-bold text-ink">{kpi.value}</div>
                  <div className={`text-[7.5px] font-semibold ${kpi.tone}`}>{kpi.note}</div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-line p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[8.5px] font-semibold text-ink">Doanh thu 7 ngày qua</div>
                <div className="text-[7.5px] text-muted">Trung bình 2,4M/ngày</div>
              </div>
              <svg
                viewBox="0 0 260 70"
                className="h-[74px] w-full"
                role="img"
                aria-label="Biểu đồ doanh thu 7 ngày"
              >
                <defs>
                  <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f7cac" stopOpacity=".28" />
                    <stop offset="100%" stopColor="#4f7cac" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 58 L40 48 L80 52 L120 34 L160 40 L200 22 L240 28 L260 18 L260 70 L0 70 Z"
                  fill="url(#hero-area)"
                />
                <path
                  d="M0 58 L40 48 L80 52 L120 34 L160 40 L200 22 L240 28 L260 18"
                  fill="none"
                  stroke="#4f7cac"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="260" cy="18" r="3" fill="#fff" stroke="#4f7cac" strokeWidth="2.2" />
              </svg>
            </div>

            <div className="rounded-lg border border-line p-2">
              <div className="mb-1 flex items-center gap-1 text-[8.5px] font-semibold text-warning">
                <TriangleAlert className="h-3 w-3" />
                Cảnh báo tồn kho
              </div>
              <div className="flex items-center justify-between text-[8px]">
                <span className="text-ink">Dầu gội Keratin 500ml</span>
                <span className="font-semibold text-danger">Còn 3 chai</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-brand-container">
                <div className="h-1 w-[22%] rounded-full bg-warning" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[8px]">
                <span className="text-ink">Thuốc nhuộm nâu 100g</span>
                <span className="font-semibold text-warning">Còn 5 hộp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
