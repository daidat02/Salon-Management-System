'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import Reveal from './Reveal';
import { SHOWCASE_TABS } from './data';

export default function ShowcaseSection() {
  const [activeKey, setActiveKey] = useState(SHOWCASE_TABS[0].key);
  const active = SHOWCASE_TABS.find((tab) => tab.key === activeKey) ?? SHOWCASE_TABS[0];

  return (
    <section id="showcase" className="border-y border-line bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">Giao diện</span>
          <h2 className="mt-3 font-display text-[28px] leading-tight font-extrabold tracking-tight text-ink sm:text-[36px]">
            Xem VietOps vận hành thật
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Sáu màn hình cốt lõi, cùng một ngôn ngữ thiết kế. Chọn tab để xem chi tiết.
          </p>
        </Reveal>

        <Reveal className="mt-9 flex flex-wrap justify-center gap-2">
          <div role="tablist" aria-label="Chọn màn hình" className="flex flex-wrap justify-center gap-2">
            {SHOWCASE_TABS.map((tab) => {
              const selected = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveKey(tab.key)}
                  className={cn(
                    'rounded-custom border px-4 py-2 text-sm font-semibold transition-colors',
                    selected
                      ? 'border-brand bg-brand text-white'
                      : 'border-line text-ink hover:border-brand/40 hover:text-brand',
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal className="mt-6 overflow-hidden rounded-xl2 border border-line bg-canvas p-2.5 shadow-lift">
          <Image
            src={active.src}
            alt={active.alt}
            width={1280}
            height={720}
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="w-full rounded-custom border border-line bg-white"
          />
        </Reveal>
        <p className="mt-3 text-center text-xs text-muted">
          Ảnh chụp giao diện thật — dữ liệu minh hoạ.
        </p>
      </div>
    </section>
  );
}
