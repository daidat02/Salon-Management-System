import Reveal from './Reveal';
import { FEATURES } from './data';

export default function FeaturesSection() {
  return (
    <section id="features" className="border-y border-line bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">Tính năng</span>
          <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
            Đủ cho một salon vận hành trọn ngày
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Từ đặt lịch, phục vụ, bán hàng, kiểm kho đến thu chi và báo cáo — không cần phần mềm
            thứ hai.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.title}
                delay={(index % 3) * 0.05}
                className="group rounded-xl2 border border-line bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/30"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-custom bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
