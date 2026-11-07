'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from 'cn';
import { SETTINGS_SECTIONS } from '../settings-config';

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-surface border-outline rounded-xl border p-2 shadow-sm">
      <p className="text-on-surface-variant px-3 py-2 text-[11px] font-bold tracking-wider uppercase">
        Danh mục thiết lập
      </p>

      <ul className="mt-1 flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = pathname === section.path;

          return (
            <li key={section.key} className="shrink-0 lg:shrink">
              <Link
                href={section.path}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary-container text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                )}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="border-outline bg-surface-container-low mt-3 hidden rounded-lg border border-dashed p-3 lg:block">
        <p className="text-on-surface text-xs font-semibold">Chế độ xem trước</p>
        <p className="text-on-surface-variant mt-1 text-[11px] leading-relaxed">
          Các thay đổi được lưu tạm trên trình duyệt, chưa kết nối dữ liệu thật.
        </p>
      </div>
    </nav>
  );
}
