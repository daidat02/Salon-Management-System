export type CustomerNotificationKey = 'reminder' | 'birthday';

export type InternalNotificationKey = 'newBooking' | 'lowStock' | 'dailyReport';

export type NotificationSettings = {
  customer: Record<CustomerNotificationKey, boolean>;
  internal: Record<InternalNotificationKey, boolean>;
  reminderHoursBefore: number;
  lowStockThreshold: number;
  reportTime: string;
};

export function createDefaultNotificationSettings(): NotificationSettings {
  return {
    customer: {
      reminder: true,
      birthday: true,
    },
    internal: {
      newBooking: true,
      lowStock: true,
      dailyReport: true,
    },
    reminderHoursBefore: 2,
    lowStockThreshold: 5,
    reportTime: '22:00',
  };
}
