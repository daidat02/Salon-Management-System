// Mock data cho page chi tiết nhân viên — bám mẫu
// preview/staff-detail.html (clone từ salon-staff-spark.lovable.app).
// Chưa kết nối API: toàn bộ số liệu dưới đây là dữ liệu mẫu,
// khi nối API chỉ cần thay các export này bằng dữ liệu fetch.

export type StaffDetailStatus = 'active' | 'leave';

export type StaffProfile = {
  code: string;
  name: string;
  position: string;
  level: string;
  levelProgress: string;
  avatarUrl?: string;
  phone: string;
  email: string;
  branch: string;
  experience: string;
  hireDate: string;
  seniority: string;
  contract: string;
  employmentType: 'fulltime' | 'parttime';
  manager: string;
  status: StaffDetailStatus;
  skills: string[];
  documents: string[];
  performance: { label: string; value: string; valueClass?: string }[];
};

export const mockStaffProfile: StaffProfile = {
  code: 'NV-008',
  name: 'Nguyễn Thùy Linh',
  position: 'Kỹ thuật viên',
  level: 'Thợ chính',
  levelProgress: 'Còn 12 ca nhuộm để xét lên Senior',
  avatarUrl: 'https://i.pravatar.cc/160?img=47',
  phone: '090 123 4567',
  email: 'thuylinh.nguyen@gmail.com',
  branch: 'Lumi Spa · Quận 1',
  experience: '3 năm 7 tháng kinh nghiệm',
  hireDate: '01/03/2023',
  seniority: '3 năm 7 tháng',
  contract: 'Full-time',
  employmentType: 'fulltime',
  manager: 'Hoàng Anh',
  status: 'active',
  skills: ['Cắt', 'Nhuộm Balayage', 'Gội dưỡng sinh', 'Massage mặt'],
  documents: ['HĐLĐ_2024.pdf', 'CCCD_scan.pdf', 'Chứng chỉ nghề.jpg'],
  performance: [
    { label: 'KPI doanh số', value: '92%', valueClass: 'text-primary' },
    { label: 'Upsell sản phẩm', value: '78%', valueClass: 'text-emerald-600' },
    { label: 'Đúng giờ', value: '96%', valueClass: 'text-amber-600' },
  ],
};

// --- Tab Thông tin chung: giá trị mặc định của form ---

export const GENDER_OPTIONS = [
  { label: 'Nữ', value: 'female' },
  { label: 'Nam', value: 'male' },
  { label: 'Khác', value: 'other' },
];

export const ROLE_OPTIONS = ['Kỹ thuật viên', 'Lễ tân'];

export const BRANCH_OPTIONS = ['Lumi Spa · Quận 1', 'Lumi Spa · Quận 3'];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'Toàn thời gian', value: 'fulltime' },
  { label: 'Bán thời gian', value: 'parttime' },
];

export const BANK_OPTIONS = ['Vietcombank', 'Techcombank', 'ACB', 'MB Bank'];

export type StaffPersonalForm = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  role: string;
  branch: string;
  startDate: string;
  employmentType: string;
};

export const mockPersonalForm: StaffPersonalForm = {
  name: mockStaffProfile.name,
  email: mockStaffProfile.email,
  phone: mockStaffProfile.phone,
  dob: '1998-03-14',
  gender: 'female',
  address: '45/12 Nguyễn Trãi, P. Bến Thành, Q.1, TP.HCM',
  role: mockStaffProfile.position,
  branch: mockStaffProfile.branch,
  startDate: '2023-03-01',
  employmentType: 'fulltime',
};

export type StaffSalaryConfig = {
  base: number;
  serviceRate: number;
  productRate: number;
  bank: string;
  account: string;
  holder: string;
};

export const mockSalaryConfig: StaffSalaryConfig = {
  base: 8000000,
  serviceRate: 10,
  productRate: 5,
  bank: 'Vietcombank',
  account: '0071008821',
  holder: 'NGUYEN THUY LINH',
};

// --- Tab Chu kỳ lương & Bảng lương ---

export const PAYROLL_CYCLES = [
  { label: 'Tháng 10/2026', value: '2026-10' },
  { label: 'Tháng 9/2026', value: '2026-09' },
  { label: 'Tháng 8/2026', value: '2026-08' },
  { label: 'Tùy chọn…', value: 'custom' },
];

/** Hệ số doanh thu theo chu kỳ (mẫu: tháng 9 = 85%, tháng 8 = 75%). */
export const PAYROLL_CYCLE_FACTOR: Record<string, number> = {
  '2026-10': 1,
  '2026-09': 0.85,
  '2026-08': 0.75,
};

export const PAYROLL_BASES = {
  /** Doanh thu dịch vụ của thợ trong kỳ chuẩn. */
  serviceRevenue: 32000000,
  /** Doanh thu bán sản phẩm của thợ trong kỳ chuẩn. */
  productRevenue: 9000000,
  bonus: 500000,
  deduction: -150000,
  advance: -1000000,
};

export const mockRecentCycles = [
  { label: 'T09/2026', value: '8.820.000 đ' },
  { label: 'T08/2026', value: '9.105.000 đ' },
  { label: 'T07/2026', value: '7.940.000 đ' },
];

/** Tỷ lệ HH theo nhóm dịch vụ (mở rộng cho salon, theo Level thợ). */
export const SERVICE_GROUP_RATES = [
  { group: 'Cắt — Gội cơ bản', rate: '10%' },
  { group: 'Uốn — Duỗi', rate: '15%' },
  { group: 'Nhuộm — Tẩy cao cấp', rate: '18%' },
  { group: 'Phục hồi — Olaplex', rate: '12%' },
];

// --- Tab Lịch sử dịch vụ ---

export type HistoryQuality = 'ok' | 'redo' | 'complaint';

export type HistoryRow = {
  id: string;
  code: string;
  service: string;
  detail: string;
  customer: string;
  time: string;
  total: string;
  commission: string;
  share: string;
  rating: number;
  quality: HistoryQuality;
  qualityNote?: string;
};

export const mockHistory: HistoryRow[] = [
  { id: 'h-01', code: '#BK-8821', service: 'Nhuộm Balayage + Phục hồi', detail: '120 phút • KTV chính', customer: 'Trần Lan Anh', time: '28/09 • 14:00–16:00', total: '2.800.000 đ', commission: '+420.000 đ', share: '15%', rating: 5, quality: 'ok' },
  { id: 'h-02', code: '#BK-8817', service: 'Gội dưỡng sinh 60’', detail: '60 phút • KTV chính', customer: 'Phạm Thu Hà', time: '28/09 • 10:30–11:30', total: '450.000 đ', commission: '+67.500 đ', share: '15%', rating: 5, quality: 'ok' },
  { id: 'h-03', code: '#BK-8809', service: 'Cắt Layer + Tạo kiểu', detail: '45 phút • + Upsell dầu gội', customer: 'Nguyễn Minh Châu', time: '27/09 • 16:20–17:05', total: '650.000 đ', commission: '+97.500 đ', share: '15%', rating: 4, quality: 'redo', qualityNote: 'Màu lên không đều — làm lại miễn phí' },
  { id: 'h-04', code: '#BK-8802', service: 'Massage mặt nâng cơ', detail: '75 phút • Hỗ trợ KTV', customer: 'Hoàng Yến', time: '26/09 • 09:00–10:15', total: '890.000 đ', commission: '+66.750 đ', share: '7.5% (chia ca)', rating: 5, quality: 'complaint', qualityNote: 'Khách phàn nàn gội đau — đã xin lỗi + giảm 20%' },
  { id: 'h-05', code: '#BK-8795', service: 'Cắt tóc nam cao cấp', detail: '45 phút • KTV chính', customer: 'Đặng Khánh Linh', time: '25/09 • 13:30–15:00', total: '350.000 đ', commission: '+52.500 đ', share: '15%', rating: 5, quality: 'ok' },
];

export const HISTORY_FILTER_OPTIONS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Đạt', value: 'ok' },
  { label: 'Làm lại', value: 'redo' },
  { label: 'Khiếu nại', value: 'complaint' },
];

// --- Tab Ngày nghỉ & Ca làm ---

export type WeekShift = 'morning' | 'afternoon' | 'off';

export type WeekDay = {
  weekday: string;
  date: string;
  shift: WeekShift;
  shiftLabel: string;
  time: string;
};

export const mockWeekRange = '12 – 18/10/2026';

export const mockWeek: WeekDay[] = [
  { weekday: 'T2', date: '12/10', shift: 'morning', shiftLabel: 'Ca sáng', time: '08:00 – 16:00' },
  { weekday: 'T3', date: '13/10', shift: 'morning', shiftLabel: 'Ca sáng', time: '08:00 – 16:00' },
  { weekday: 'T4', date: '14/10', shift: 'afternoon', shiftLabel: 'Ca chiều', time: '13:00 – 21:00' },
  { weekday: 'T5', date: '15/10', shift: 'afternoon', shiftLabel: 'Ca chiều', time: '13:00 – 21:00' },
  { weekday: 'T6', date: '16/10', shift: 'morning', shiftLabel: 'Ca sáng', time: '08:00 – 16:00' },
  { weekday: 'T7', date: '17/10', shift: 'afternoon', shiftLabel: 'Ca chiều', time: '13:00 – 21:00' },
  { weekday: 'CN', date: '18/10', shift: 'off', shiftLabel: 'Nghỉ', time: '—' },
];

export const SHIFT_OPTIONS: { label: string; value: WeekShift }[] = [
  { label: 'Ca sáng', value: 'morning' },
  { label: 'Ca chiều', value: 'afternoon' },
  { label: 'Nghỉ', value: 'off' },
];

export type LeaveRow = {
  id: string;
  date: string;
  days: string;
  type: 'paid' | 'unpaid';
  reason: string;
  status: 'approved' | 'pending';
};

export const mockLeaves: LeaveRow[] = [
  { id: 'l-01', date: '04/10/2026', days: '1 ngày', type: 'paid', reason: 'Việc gia đình', status: 'approved' },
  { id: 'l-02', date: '15/09/2026', days: '1 ngày', type: 'paid', reason: 'Cảm sốt (có giấy BS)', status: 'approved' },
  { id: 'l-03', date: '18/10/2026', days: '2 ngày', type: 'paid', reason: 'Du lịch cùng gia đình', status: 'pending' },
];

export const mockLeaveBalance = { used: 2, total: 12 };

// --- Hiệu suất tháng này (khối trong header mẫu) ---

export const mockMonthStats = {
  completed: 48,
  rating: 4.9,
  revenue: '32.000.000 ₫',
  targetPercent: 80,
};

export function formatVND(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
}
