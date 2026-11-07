import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BookingSettingsView from '../components/booking/BookingSettingsView';
import ComingSoonSection from '../components/ComingSoonSection';
import FinanceSettingsView from '../components/finance/FinanceSettingsView';
import GeneralSettingsView from '../components/general/GeneralSettingsView';
import NotificationsSettingsView from '../components/notifications/NotificationsSettingsView';
import PaymentSettingsView from '../components/payment/PaymentSettingsView';
import { getSettingsSection, SETTINGS_SECTIONS } from '../settings-config';

export const metadata: Metadata = { title: 'Cài đặt salon | SALON ADMIN' };

export function generateStaticParams() {
  return SETTINGS_SECTIONS.map((section) => ({ section: section.key }));
}

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const config = getSettingsSection(section);

  if (!config) notFound();

  if (config.key === 'general') {
    return <GeneralSettingsView />;
  }

  if (config.key === 'booking') {
    return <BookingSettingsView />;
  }

  if (config.key === 'payment') {
    return <PaymentSettingsView />;
  }

  if (config.key === 'notifications') {
    return <NotificationsSettingsView />;
  }

  if (config.key === 'finance') {
    return <FinanceSettingsView />;
  }

  return <ComingSoonSection section={config} />;
}
