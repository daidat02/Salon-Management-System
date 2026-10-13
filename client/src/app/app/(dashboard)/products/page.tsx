import type { Metadata } from 'next';
import ProductsTable from './components/ProductsTable';
import ProductToolbar from './components/ProductToolbar';
import ProductHeading from './components/ProductHeading';
import ProductsStats from './components/ProductsStats';

export const metadata: Metadata = { title: 'Sản phẩm | SALON ADMIN' };

export default function ProductsPage() {
  return (
    <div className="space-y-4">
      <ProductHeading />

      <ProductsStats />

      <ProductToolbar />
      <ProductsTable />
    </div>
  );
}
