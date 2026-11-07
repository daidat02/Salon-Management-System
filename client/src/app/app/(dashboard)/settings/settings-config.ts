import {
  BellRing,
  CalendarDays,
  CreditCard,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type SettingsSectionKey =
  | 'general'
  | 'booking'
  | 'payment'
  | 'finance'
  | 'crm'
  | 'notifications';

export type SettingsSection = {
  key: SettingsSectionKey;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
  planned: string[];
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    key: 'general',
    label: 'Cửa hàng',
    path: '/app/settings/general',
    icon: Store,
    description:
      'Thông tin nhận diện salon, giờ mở cửa và các quy tắc hiển thị, hóa đơn chung.',
    planned: [],
  },
  {
    key: 'booking',
    label: 'Lịch hẹn',
    path: '/app/settings/booking',
    icon: CalendarDays,
    description:
      'Quy tắc đặt lịch, khung giờ, giới hạn đặt trước, hủy/đổi và tự động xác nhận.',
    planned: [],
  },
  {
    key: 'payment',
    label: 'Thu ngân & Thanh toán',
    path: '/app/settings/payment',
    icon: CreditCard,
    description:
      'Phương thức thanh toán, tài khoản nhận tiền, thiết bị quầy và quy tắc chốt đơn.',
    planned: [],
  },
  {
    key: 'finance',
    label: 'Tài chính & Quỹ',
    path: '/app/settings/finance',
    icon: Wallet,
    description:
      'Quản lý quỹ tiền mặt / ngân hàng, danh mục thu chi mặc định và quy tắc chốt ca.',
    planned: [],
  },
  {
    key: 'crm',
    label: 'Khách hàng & Loyalty',
    path: '/app/settings/crm',
    icon: Users,
    description:
      'Hạng thành viên, quy tắc tích điểm/đổi điểm và phân loại khách hàng.',
    planned: [
      'Hạng thành viên (Bạc, Vàng, Kim Cương) và ngưỡng chi tiêu',
      'Tỷ lệ tích điểm và quy đổi điểm',
      'Thời hạn hết hạn của điểm thưởng',
      'Phân loại / tag khách hàng (VIP, khách mới, churn risk)',
      'Voucher sinh nhật và ưu đãi tự động',
    ],
  },
  {
    key: 'notifications',
    label: 'Thông báo',
    path: '/app/settings/notifications',
    icon: BellRing,
    description:
      'Bật/tắt nhắc lịch, chăm sóc khách hàng và các cảnh báo vận hành nội bộ.',
    planned: [],
  },
];

export function getSettingsSection(key: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.key === key);
}
