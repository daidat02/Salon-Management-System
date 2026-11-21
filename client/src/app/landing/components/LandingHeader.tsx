'use client';

import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import Logo from '@/components/brand/Logo';
import { LOGIN_HREF, NAV_LINKS, TRIAL_HREF } from './data';
import { cn } from '@/lib/utils';

export default function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <a href="#top" aria-label="VietOps — về đầu trang">
          <Logo />
        </a>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted lg:flex" aria-label="Chính">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-brand">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href={LOGIN_HREF}
            className="hidden rounded-custom px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-light hover:text-brand sm:inline-flex"
          >
            Đăng nhập
          </a>
          <a
            href={TRIAL_HREF}
            className="hidden items-center gap-2 rounded-custom bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex"
          >
            Dùng thử miễn phí
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-custom text-ink transition-colors hover:bg-brand-light lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div id="landing-mobile-menu" className={cn('border-t border-line bg-white lg:hidden', !open && 'hidden')}>
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3" aria-label="Menu di động">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-custom px-3 py-3 text-sm font-medium text-ink hover:bg-canvas"
            >
              {link.label}
            </a>
          ))}
          <a
            href={TRIAL_HREF}
            onClick={() => setOpen(false)}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-custom bg-brand px-4 py-3 text-sm font-semibold text-white"
          >
            Dùng thử miễn phí <ArrowRight className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}
