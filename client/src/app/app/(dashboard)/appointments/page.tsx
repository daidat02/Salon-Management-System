import type { Metadata } from 'next';
import { AppointmentsHeader } from './components/AppointmentsHeader';
import AppointmentsView from './components/AppointmentsView';
import AppointmentsStats from './components/AppointmentsStats';
import AppointmentToolbar from './components/AppointmentToolbar';

export const metadata: Metadata = { title: 'Lịch hẹn | SALON ADMIN' };

export default function AppointmentsPage() {
  return (
    <div className="space-y-4">
      <AppointmentsHeader />
      <AppointmentsStats />
      <AppointmentToolbar />
      <AppointmentsView />
    </div>
  );
}
