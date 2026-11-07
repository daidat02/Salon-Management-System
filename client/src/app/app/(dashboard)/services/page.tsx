import type { Metadata } from 'next';
import ServicesTable from './components/ServicesTable';
import ServiceHeading from './components/ServiceHeading';
import ServiceToolbar from './components/ServiceToolbar';
import ServicesStats from './components/ServicesStats';

export const metadata: Metadata = { title: 'Dịch vụ | SALON ADMIN' };

export default function ServicesPage() {
  return (
    <div className="space-y-4">
      <ServiceHeading />

      <ServicesStats />

      <ServiceToolbar />
      <ServicesTable />
    </div>
  );
}
