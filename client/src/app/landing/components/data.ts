import {
  Archive,
  CalendarCheck,
  ChartColumn,
  ShieldCheck,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/** Dashboard chạy ở subdomain app; CTA landing trỏ sang đó. */
export const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://app.localhost:3000';
export const LOGIN_HREF = `${APP_BASE_URL}/login`;
/** CTA dùng thử luôn cuộn xuống form trong trang, không có trang đăng ký riêng. */
export const TRIAL_HREF = '#dung-thu';

export type NavLink = { label: string; href: string };

export const NAV_LINKS: NavLink[] = [
  { label: 'Tính năng', href: '#features' },
  { label: 'Cách hoạt động', href: '#how' },
  { label: 'Giao diện', href: '#showcase' },
  { label: 'Bảng giá', href: '#pricing' },
  { label: 'Câu hỏi', href: '#faq' },
];

export const HERO_CHECKS = [
  'Không cần thẻ tín dụng',
  'Cài đặt trong 5 phút',
  'Hỗ trợ tiếng Việt',
];

export type Metric = {
  value: number;
  suffix: string;
  decimals?: number;
  label: string;
};

export const METRICS: Metric[] = [
  { value: 1200, suffix: '+', label: 'salon & spa' },
  { value: 450, suffix: 'K+', label: 'lịch hẹn mỗi năm' },
  { value: 99.9, suffix: '%', decimals: 1, label: 'thời gian hoạt động' },
  { value: 4.9, suffix: '/5', decimals: 1, label: 'điểm hài lòng' },
];

export const PROBLEMS = [
  'Lịch hẹn ghi tay, dễ trùng giờ và khách quên lịch.',
  'Bán hàng và thu tiền tách rời, hay sót đơn, sót tiền.',
  'Kho vật tư hết lúc nào không biết, phải chạy mua gấp.',
  'Sổ thu chi chồng chéo, cuối tháng mới biết lãi lỗ.',
  'Báo cáo phải ghép tay từ nhiều file Excel.',
];

export const SOLUTIONS = [
  'Lịch hẹn thông minh, chống trùng giờ, nhắc khách tự động.',
  'Thu ngân và đơn hàng một luồng, tự động trừ kho.',
  'Cảnh báo tồn kho theo định mức vật tư từng dịch vụ.',
  'Thu chi minh bạch, duyệt phiếu và đối soát quỹ.',
  'Báo cáo doanh thu & lợi nhuận theo thời gian thực.',
];

export type Feature = { icon: LucideIcon; title: string; description: string };

export const FEATURES: Feature[] = [
  {
    icon: CalendarCheck,
    title: 'Lịch hẹn thông minh',
    description:
      'Đặt lịch, đổi/hủy, xem lịch tuần và chống trùng giờ. Nhận diện khách qua số điện thoại.',
  },
  {
    icon: ShoppingCart,
    title: 'Thu ngân & đơn hàng',
    description:
      'Tạo đơn tại quầy, thanh toán, theo dõi trạng thái và tự động tính tổng tiền phía server.',
  },
  {
    icon: Archive,
    title: 'Quản lý kho',
    description:
      'Nhập/xuất kho, định mức vật tư theo dịch vụ, cảnh báo sắp hết và lịch sử giao dịch.',
  },
  {
    icon: Wallet,
    title: 'Thu chi & công nợ',
    description:
      'Quản lý quỹ, phiếu thu/chi, duyệt phiếu và đối soát dòng tiền minh bạch mỗi ngày.',
  },
  {
    icon: ChartColumn,
    title: 'Báo cáo doanh thu',
    description:
      'Doanh thu, lợi nhuận, cơ cấu dịch vụ và dịch vụ bán chạy theo tuần, tháng, quý.',
  },
  {
    icon: ShieldCheck,
    title: 'Phân quyền & bảo mật',
    description:
      'Vai trò owner/manager/receptionist, xác thực JWT và kiểm soát truy cập theo phòng ban.',
  },
];

export type Step = { number: string; title: string; description: string };

export const STEPS: Step[] = [
  {
    number: '01',
    title: 'Tạo tài khoản salon',
    description: 'Đăng ký bằng số điện thoại, đặt tên salon và chọn vai trò chủ salon.',
  },
  {
    number: '02',
    title: 'Nhập dịch vụ & nhân viên',
    description: 'Thêm dịch vụ, sản phẩm, vật tư và nhân viên — hoặc dùng dữ liệu mẫu.',
  },
  {
    number: '03',
    title: 'Đặt lịch & bán hàng',
    description: 'Lễ tân đặt lịch, thu ngân tạo đơn, kho tự động trừ theo định mức.',
  },
  {
    number: '04',
    title: 'Theo dõi mỗi ngày',
    description: 'Mở dashboard là thấy doanh thu, tồn kho, thu chi và báo cáo lợi nhuận.',
  },
];

export type ShowcaseTab = { key: string; label: string; src: string; alt: string };

export const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    key: 'overview',
    label: 'Tổng quan',
    src: '/landing/02-overview.png',
    alt: 'Màn hình tổng quan VietOps',
  },
  {
    key: 'appointments',
    label: 'Lịch hẹn',
    src: '/landing/03-appointments.png',
    alt: 'Màn hình lịch hẹn VietOps',
  },
  {
    key: 'cashier',
    label: 'Thu ngân',
    src: '/landing/04-cashier.png',
    alt: 'Màn hình thu ngân VietOps',
  },
  {
    key: 'inventory',
    label: 'Kho hàng',
    src: '/landing/05-inventory.png',
    alt: 'Màn hình kho hàng VietOps',
  },
  {
    key: 'cashflow',
    label: 'Thu chi',
    src: '/landing/06-cashflow.png',
    alt: 'Màn hình thu chi VietOps',
  },
  {
    key: 'reports',
    label: 'Báo cáo',
    src: '/landing/07-reports.png',
    alt: 'Màn hình báo cáo VietOps',
  },
];

export type ImpactStat = { value: number; suffix: string; label: string };

export const IMPACT_STATS: ImpactStat[] = [
  { value: 42, suffix: '%', label: 'giảm thời gian làm sổ' },
  { value: 28, suffix: '%', label: 'giảm lịch hẹn trống' },
  { value: 17, suffix: '%', label: 'tăng doanh thu dịch vụ' },
  { value: 3, suffix: 'h', label: 'tiết kiệm mỗi tuần' },
];

export type Testimonial = {
  quote: string;
  name: string;
  salon: string;
  initials: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Trước đây cuối ngày phải cộng sổ tay. Giờ mở VietOps là thấy doanh thu, đơn nào chưa thu tiền và kho còn gì.',
    name: 'Chị Ngọc Ánh',
    salon: 'Aura Hair & Beauty · Quận 1',
    initials: 'NA',
  },
  {
    quote:
      'Lịch tuần gọn, nhân viên tự xem ca của mình. Khách quên lịch có nhắc nên đỡ trống ghế hẳn.',
    name: 'Anh Quốc Huy',
    salon: 'Luxe Hair & Spa · Tân Bình',
    initials: 'QH',
  },
  {
    quote:
      'Phần thu chi rõ ràng, duyệt phiếu trên điện thoại. Cuối tháng có báo cáo lợi nhuận luôn, không phải chờ kế toán.',
    name: 'Chị Thu Trang',
    salon: 'Mộc Salon · Đà Nẵng',
    initials: 'TT',
  },
];

export type PricingFeature = {
  text: string;
  /** `check` = có sẵn, `sparkles` = nâng cao. */
  icon: 'check' | 'sparkles';
  strong?: boolean;
};

export type PricingPlan = {
  key: string;
  name: string;
  description: string;
  /** `null` = giá cố định (hiển thị `fixedPrice`). */
  monthly: string | null;
  yearly: string | null;
  fixedPrice?: string;
  period: string;
  cta: string;
  features: PricingFeature[];
  featured?: boolean;
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: 'trial',
    name: 'Dùng thử',
    description: 'Trải nghiệm trọn vẹn trước khi quyết định.',
    monthly: null,
    yearly: null,
    fixedPrice: '0đ',
    period: '/ 14 ngày',
    cta: 'Dùng thử miễn phí',
    features: [
      { text: 'Đầy đủ tính năng gói Phổ biến', icon: 'check' },
      { text: 'Không cần thẻ tín dụng', icon: 'check' },
      { text: 'Hỗ trợ qua Zalo', icon: 'check' },
    ],
  },
  {
    key: 'popular',
    name: 'Phổ biến',
    description: 'Không giới hạn tính năng, đủ để vận hành mỗi ngày.',
    monthly: '299.000đ',
    yearly: '239.000đ',
    period: '/ tháng',
    cta: 'Chọn gói Phổ biến',
    features: [
      { text: 'Lịch hẹn & khách hàng không giới hạn', icon: 'check' },
      { text: 'Thu ngân, đơn hàng, thanh toán', icon: 'check' },
      { text: 'Quản lý kho & định mức vật tư', icon: 'check' },
      { text: 'Thu chi, quỹ & công nợ', icon: 'check' },
      { text: 'Báo cáo doanh thu & lợi nhuận', icon: 'check' },
      { text: 'Phân quyền nhân viên', icon: 'check' },
    ],
  },
  {
    key: 'pro',
    name: 'Chuyên nghiệp',
    description: 'Tự động hoá nhắc lịch, cọc và kênh liên hệ.',
    monthly: '599.000đ',
    yearly: '479.000đ',
    period: '/ tháng',
    cta: 'Chọn gói Chuyên nghiệp',
    featured: true,
    features: [
      { text: 'Tất cả tính năng gói Phổ biến', icon: 'check', strong: true },
      { text: 'Thông báo nhắc lịch tự động', icon: 'sparkles' },
      { text: 'Đặt cọc & quản lý tiền cọc', icon: 'sparkles' },
      { text: 'Tích hợp Zalo OA', icon: 'sparkles' },
      { text: 'Gửi tin nhắn SMS & email', icon: 'sparkles' },
      { text: 'Hỗ trợ ưu tiên', icon: 'check' },
    ],
  },
];

export type Faq = { question: string; answer: string };

export const FAQS: Faq[] = [
  {
    question: 'VietOps có phù hợp salon nhỏ 1–2 ghế không?',
    answer:
      'Có. Gói Dùng thử và Phổ biến không giới hạn tính năng, phù hợp cả salon nhỏ lẫn salon nhiều nhân viên. Bạn chỉ trả khi thấy thực sự cần.',
  },
  {
    question: 'Dùng thử có giới hạn thời gian không?',
    answer:
      'Bản dùng thử kéo dài 14 ngày với đầy đủ tính năng của gói Phổ biến, không cần thẻ tín dụng.',
  },
  {
    question: 'Tôi có thể nhập dữ liệu từ Excel không?',
    answer:
      'Có. Đội ngũ VietOps hỗ trợ nhập danh sách khách hàng, dịch vụ và sản phẩm từ file Excel trong quá trình khởi tạo.',
  },
  {
    question: 'Dữ liệu của salon có an toàn không?',
    answer:
      'Dữ liệu được tách theo từng salon, phân quyền theo vai trò, xác thực JWT và sao lưu định kỳ.',
  },
  {
    question: 'Có dùng được trên điện thoại không?',
    answer:
      'Giao diện responsive, dùng tốt trên máy tính bảng và điện thoại cho lễ tân và quản lý.',
  },
  {
    question: 'Thanh toán và hoá đơn thế nào?',
    answer:
      'Thanh toán theo tháng hoặc theo năm (giảm 20%). Hoá đơn xuất theo thông tin salon bạn cung cấp.',
  },
];

export type FooterLink = { label: string; href: string };
export type FooterGroup = { title: string; links: FooterLink[] };

export const FOOTER_GROUPS: FooterGroup[] = [
  {
    title: 'Sản phẩm',
    links: [
      { label: 'Tính năng', href: '#features' },
      { label: 'Giao diện', href: '#showcase' },
      { label: 'Bảng giá', href: '#pricing' },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Câu hỏi thường gặp', href: '#faq' },
      { label: 'Liên hệ tư vấn', href: '#dung-thu' },
      { label: 'Về đầu trang', href: '#top' },
    ],
  },
];

export const CONTACTS = [
  { icon: 'mail' as const, label: 'hello@vietops.vn' },
  { icon: 'phone' as const, label: '1900 0000' },
  { icon: 'pin' as const, label: 'TP. Hồ Chí Minh' },
];
