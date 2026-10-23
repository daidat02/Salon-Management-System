import type { Metadata } from 'next';
import CashflowHeading from './components/CashflowHeading';
import CashflowStats from './components/CashflowStats';
import CashflowView from './components/CashflowView';

export const metadata: Metadata = { title: 'Thu & Chi | SALON ADMIN' };

export default function CashflowPage() {
  return (
    <div className="space-y-4">
      <CashflowHeading />

      <CashflowStats />
      <CashflowView />
    </div>
  );
}
