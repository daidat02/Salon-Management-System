import type { Metadata } from 'next';
import { FileDown, Plus } from 'lucide-react';
import PageHeading from '@/components/dashboard/PageHeading';
import CustomersTable from './components/CustomersTable';
import CustomersToolbar from './components/CustomersToolbar';
import CustomerHeading from './components/CustomerHeading';
import CustomersStats from './components/CustomersStats';
export const metadata: Metadata = { title: 'Khách hàng | SALON ADMIN' };

export default function CustomersPage() {
  return (
    <div className="space-y-4">
      <CustomerHeading />

      <CustomersStats />

      <CustomersToolbar />
      <CustomersTable />
    </div>
  );
}
