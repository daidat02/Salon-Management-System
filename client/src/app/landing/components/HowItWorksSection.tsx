import Reveal from './Reveal';
import { STEPS } from './data';

export default function HowItWorksSection() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          Cách hoạt động
        </span>
        <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
          Lên sóng trong một buổi chiều
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Không cần đội IT. Bốn bước để salon của bạn chạy trên VietOps.
        </p>
      </Reveal>

      <ol className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li key={step.number}>
            <Reveal
              delay={index * 0.05}
              className="h-full rounded-xl2 border border-line bg-white p-6 shadow-card"
            >
              <span className="font-display text-4xl font-extrabold text-brand/20">
                {step.number}
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
