import type { Metadata } from 'next';
import CashierHeading from './components/CashierHeading';
import CashierView from './components/CashierView';

export const metadata: Metadata = { title: 'Thu ngân | SALON ADMIN' };

export default function CashierPage() {
  return (
    <div className="space-y-4">
      <CashierHeading />
      <CashierView />
    </div>
  );
}
