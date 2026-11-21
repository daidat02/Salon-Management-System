import { Check, CheckCircle2, CircleX, Minus } from 'lucide-react';
import Reveal from './Reveal';
import { PROBLEMS, SOLUTIONS } from './data';

export default function ProblemSolutionSection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          Vấn đề &amp; giải pháp
        </span>
        <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
          Vận hành salon đang rối ở đâu?
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Phần lớn salon vẫn ghép lịch hẹn, sổ sách và file Excel với nhau. VietOps thay thế bằng
          một luồng vận hành liền mạch.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Reveal className="rounded-xl2 border border-danger/15 bg-white p-7 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-custom bg-danger/10 text-danger">
              <CircleX className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink">Khi mọi thứ nằm rời rạc</h3>
          </div>
          <ul className="mt-5 space-y-3.5 text-sm text-muted">
            {PROBLEMS.map((item) => (
              <li key={item} className="flex gap-3">
                <Minus className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="rounded-xl2 border border-brand/20 bg-white p-7 shadow-card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-custom bg-brand-light text-brand">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-bold text-ink">Khi mọi thứ về một mối</h3>
          </div>
          <ul className="mt-5 space-y-3.5 text-sm text-muted">
            {SOLUTIONS.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
