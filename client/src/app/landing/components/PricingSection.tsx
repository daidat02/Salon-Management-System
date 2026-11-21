'use client';

import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';
import { PRICING_PLANS, TRIAL_HREF } from './data';

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="border-y border-line bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">Bảng giá</span>
          <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
            Bắt đầu miễn phí, nâng cấp khi cần
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Gói Dùng thử mở đầy đủ tính năng của gói Phổ biến. Trả theo năm tiết kiệm 20%.
          </p>
        </Reveal>

        <Reveal className="mt-8 flex items-center justify-center gap-3">
          <span className="text-sm font-medium text-muted">Theo tháng</span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Chuyển sang thanh toán theo năm"
            onClick={() => setYearly((v) => !v)}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
              yearly ? 'bg-brand' : 'bg-line',
            )}
          >
            <span
              className={cn(
                'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
                yearly && 'translate-x-5',
              )}
            />
          </button>
          <span className="text-sm font-medium text-muted">
            Theo năm
            <span className="ml-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
              -20%
            </span>
          </span>
        </Reveal>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, index) => (
            <Reveal
              key={plan.key}
              delay={index * 0.05}
              className={cn(
                'flex flex-col rounded-xl2 bg-white p-7',
                plan.featured
                  ? 'relative border-2 border-brand shadow-lift lg:-translate-y-2'
                  : 'border border-line shadow-card',
              )}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase">
                  Đầy đủ nhất
                </span>
              )}
              <h3 className="font-display text-lg font-bold text-ink">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>

              <div className="mt-5 flex items-end gap-1">
                <span
                  className={cn(
                    'font-display text-[34px] font-extrabold',
                    plan.featured ? 'text-brand' : 'text-ink',
                  )}
                >
                  {plan.monthly === null
                    ? plan.fixedPrice
                    : yearly
                      ? plan.yearly
                      : plan.monthly}
                </span>
                <span className="pb-1 text-sm text-muted">{plan.period}</span>
              </div>
              <p className="mt-1 h-4 text-[11px] text-muted">
                {plan.monthly !== null && yearly ? 'Thanh toán theo năm (tiết kiệm 20%)' : ''}
              </p>

              <a
                href={TRIAL_HREF}
                className={cn(
                  'mt-5 inline-flex min-h-[44px] items-center justify-center rounded-custom px-5 text-sm font-semibold transition-colors',
                  plan.featured
                    ? 'bg-brand text-white hover:bg-brand-hover'
                    : 'border border-line bg-white text-ink hover:border-brand/40 hover:bg-brand-light hover:text-brand',
                )}
              >
                {plan.cta}
              </a>

              <ul className="mt-6 space-y-3 text-sm text-muted">
                {plan.features.map((feature) => {
                  const advanced = feature.icon === 'sparkles';
                  const Icon = advanced ? Sparkles : Check;
                  return (
                    <li key={feature.text} className="flex gap-2.5">
                      <Icon
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0',
                          advanced ? 'text-brand' : 'text-success',
                        )}
                      />
                      <span className={feature.strong ? 'font-semibold text-ink' : undefined}>
                        {feature.text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Giá đã gồm VAT. Bảng giá minh hoạ cho bản preview.
        </p>
      </div>
    </section>
  );
}
