import Link from 'next/link';
import { Check } from 'lucide-react';
import type { SettingsSection } from '../settings-config';

export default function ComingSoonSection({ section }: { section: SettingsSection }) {
  const Icon = section.icon;

  return (
    <div className="space-y-4">
      <section className="bg-surface border-outline rounded-xl border p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="bg-primary-container text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-on-surface text-base font-bold">{section.label}</h2>
              <p className="text-on-surface-variant mt-1 max-w-2xl text-xs leading-relaxed">
                {section.description}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.planned.map((item) => (
            <div
              key={item}
              className="border-outline bg-surface-container-low flex items-start gap-2 rounded-lg border px-3 py-2.5"
            >
              <span className="bg-primary-container text-primary mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-on-surface text-xs leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-outline bg-surface text-on-surface-variant rounded-xl border border-dashed p-5 text-xs leading-relaxed">
        Phần này sẽ được triển khai ở giai đoạn sau. Hiện tại bạn có thể xem mẫu UI hoàn chỉnh tại{' '}
        <Link href="/settings/finance" className="text-primary font-semibold hover:underline">
          Tài chính &amp; Quỹ
        </Link>
        .
      </div>
    </div>
  );
}
