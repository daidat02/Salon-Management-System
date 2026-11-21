import { Star } from 'lucide-react';
import Reveal from './Reveal';
import { TESTIMONIALS } from './data';

export default function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">Khách hàng</span>
        <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
          Chủ salon nói gì
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">Nội dung minh hoạ cho bản preview.</p>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((item, index) => (
          <Reveal
            key={item.name}
            delay={index * 0.07}
            className="flex flex-col rounded-xl2 border border-line bg-white p-6 shadow-card"
          >
            <div className="flex gap-0.5 text-warning" aria-label="5 trên 5 sao">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-ink">
              “{item.quote}”
            </blockquote>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-container font-display text-sm font-bold text-brand">
                {item.initials}
              </span>
              <div>
                <div className="text-sm font-semibold text-ink">{item.name}</div>
                <div className="text-xs text-muted">{item.salon}</div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
