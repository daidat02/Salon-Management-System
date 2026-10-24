import type { Metadata } from 'next';
import ReportsHeading from './components/ReportsHeading';
import ReportView from './components/ReportView';

export const metadata: Metadata = { title: 'Báo cáo | SALON ADMIN' };

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <ReportsHeading />
      <ReportView />
    </div>
  );
}
