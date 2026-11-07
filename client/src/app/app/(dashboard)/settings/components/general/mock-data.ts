export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type WorkingHours = {
  openTime: string;
  closeTime: string;
  breakNote: string;
  days: Weekday[];
};

export type SalonInfo = {
  name: string;
  slogan: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  taxCode: string;
  logoUrl: string;
};

export type GeneralSettings = {
  salon: SalonInfo;
  workingHours: WorkingHours;
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 7];

export function createDefaultSettings(): GeneralSettings {
  return {
    salon: {
      name: 'SALON TÓC MỘC - CHI NHÁNH TRUNG TÂM',
      slogan: 'Nâng tầm phong cách và nét đẹp rạng ngời',
      phone: '0909 888 999',
      email: 'contact@mochanh.vn',
      website: 'fb.com/salonadmin.official',
      address: 'Số 123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      taxCode: '0314982736',
      logoUrl: '',
    },
    workingHours: {
      openTime: '08:30',
      closeTime: '20:30',
      breakNote: '12:30 - 13:30',
      days: [...WEEKDAYS],
    },
  };
}
