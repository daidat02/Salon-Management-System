import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { CONTACTS, FOOTER_GROUPS } from './data';

const CONTACT_ICONS = {
  mail: Mail,
  phone: Phone,
  pin: MapPin,
} as const;

export default function LandingFooter() {
  return (
    <footer id="dang-nhap" className="border-t border-line bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo subtitle={null} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Vietnam Service Operations Platform — nền tảng vận hành dịch vụ cho salon &amp; spa
              Việt Nam.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              Bản preview thiết kế
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-bold text-ink">{group.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="transition-colors hover:text-brand">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="text-sm font-bold text-ink">Liên hệ</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {CONTACTS.map((contact) => {
                const Icon = CONTACT_ICONS[contact.icon];
                return (
                  <li key={contact.label} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-brand" />
                    {contact.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>© 2026 VietOps. Trang preview — dữ liệu minh hoạ, chưa phải sản phẩm chính thức.</p>
          <p>Thiết kế theo hệ màu dashboard VietOps.</p>
        </div>
      </div>
    </footer>
  );
}
