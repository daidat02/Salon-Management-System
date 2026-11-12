import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500">
        <ShieldX className="h-7 w-7" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h1>
        <p className="text-sm text-slate-500">
          Vai trò hiện tại không được phép mở trang này.
        </p>
      </div>
      <Button render={<Link href="/app/overview" />} variant="outline" size="sm">
        Về trang tổng quan
      </Button>
    </div>
  );
}
