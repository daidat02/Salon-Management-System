import { ChevronDown } from 'lucide-react';
import Reveal from './Reveal';
import { FAQS } from './data';

export default function FaqSection() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-16 lg:px-8 lg:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
          Câu hỏi thường gặp
        </span>
        <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
          Còn điều gì bạn băn khoăn?
        </h2>
      </Reveal>

      <div className="mt-10 space-y-3">
        {FAQS.map((faq) => (
          <Reveal key={faq.question}>
            <details className="faq group rounded-custom border border-line bg-white px-5 py-4 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                {faq.question}
                <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-muted" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{faq.answer}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
