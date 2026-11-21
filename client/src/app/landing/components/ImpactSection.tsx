import Counter from './Counter';
import Reveal from './Reveal';
import { IMPACT_STATS } from './data';

export default function ImpactSection() {
  return (
    <section className="relative overflow-hidden bg-ink">
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 -left-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[26px] leading-tight font-extrabold tracking-tight text-white sm:text-[34px]">
            Salon dùng VietOps thay đổi thế nào?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            Số liệu tổng hợp từ khảo sát khách hàng (nội dung minh hoạ cho bản preview).
          </p>
        </Reveal>

        <div className="mt-11 grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
          {IMPACT_STATS.map((stat, index) => (
            <Reveal key={stat.label} delay={index * 0.05}>
              <div className="font-display text-[34px] font-extrabold text-white">
                <Counter value={stat.value} />
                <span className="text-brand-container">{stat.suffix}</span>
              </div>
              <div className="mt-1 text-sm text-white/65">{stat.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
