import { ArrowRight, CheckCircle2, Play } from 'lucide-react';
import HeroDashboardMock from './HeroDashboardMock';
import Reveal from './Reveal';
import { HERO_CHECKS, TRIAL_HREF } from './data';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-brand-light/70 via-white to-white">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-24 h-72 w-72 rounded-full bg-brand/5 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pt-14 pb-16 lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:px-8 lg:pt-20 lg:pb-24">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-brand shadow-sm">
            <span className="flex h-1.5 w-1.5 rounded-full bg-success" />
            Nền tảng vận hành dịch vụ Việt Nam
          </span>
          <h1 className="mt-5 font-display text-[34px] leading-[1.12] font-extrabold tracking-tight text-ink sm:text-[46px] lg:text-[52px]">
            VietOps
            <span className="block text-brand">Vietnam Service Operations Platform</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Gom lịch hẹn, thu ngân, kho hàng, thu chi và báo cáo về{' '}
            <strong className="font-semibold text-ink">một nền tảng duy nhất</strong> — để chủ salon
            &amp; spa điều hành cả ngày chỉ trong một màn hình.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={TRIAL_HREF}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-custom bg-brand px-6 text-sm font-semibold text-white shadow-card transition-all hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Dùng thử miễn phí
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#showcase"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-custom border border-line bg-white px-6 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-brand/40 hover:bg-brand-light/60 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Play className="h-4 w-4" />
              Xem giao diện
            </a>
          </div>

          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-muted">
            {HERO_CHECKS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.12}>
          <HeroDashboardMock />
        </Reveal>
      </div>
    </section>
  );
}
