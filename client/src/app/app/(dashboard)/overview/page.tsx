import type { Metadata } from 'next';
import OverviewView from './components/OverviewView';

export const metadata: Metadata = { title: 'Tổng quan | SALON ADMIN' };

export default function OverviewPage() {
  return <OverviewView />;
}
