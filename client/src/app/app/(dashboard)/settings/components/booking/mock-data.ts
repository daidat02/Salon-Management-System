export type BookingSettings = {
  slotStepMinutes: string;
  maxPerSlot: number;
  minLeadMinutes: number;
  maxAdvanceDays: number;
  allowOnlineBooking: boolean;
  autoConfirm: boolean;
  allowCancel: boolean;
  cancelBeforeHours: number;
  maxCancellationsPerMonth: number;
  allowReschedule: boolean;
  rescheduleBeforeHours: number;
  depositEnabled: boolean;
  /** Tỷ lệ cọc theo giá trị đơn (0–100). */
  depositPercent: number;
  /** Mức cọc tối đa; 0 = không giới hạn. */
  depositMaxAmount: number;
  noShowThreshold: number;
  noShowLookbackDays: number;
};

export const SLOT_STEP_OPTIONS = [
  { label: '15 phút', value: '15' },
  { label: '30 phút', value: '30' },
  { label: '45 phút', value: '45' },
  { label: '60 phút', value: '60' },
];

export function createDefaultBookingSettings(): BookingSettings {
  return {
    slotStepMinutes: '30',
    maxPerSlot: 2,
    minLeadMinutes: 60,
    maxAdvanceDays: 30,
    allowOnlineBooking: true,
    autoConfirm: false,
    allowCancel: true,
    cancelBeforeHours: 4,
    maxCancellationsPerMonth: 3,
    allowReschedule: true,
    rescheduleBeforeHours: 2,
    depositEnabled: true,
    depositPercent: 30,
    depositMaxAmount: 0,
    noShowThreshold: 2,
    noShowLookbackDays: 180,
  };
}
