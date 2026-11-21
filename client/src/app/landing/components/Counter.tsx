'use client';

import { useEffect, useRef, useState } from 'react';

type CounterProps = {
  value: number;
  /** Số chữ số thập phân (dùng dấu phẩy kiểu Việt Nam). */
  decimals?: number;
};

function format(value: number, decimals?: number) {
  if (decimals !== undefined) return value.toFixed(decimals).replace('.', ',');
  return Math.round(value).toLocaleString('vi-VN');
}

/** Đếm số khi phần tử vào khung nhìn; giảm chuyển động thì hiện thẳng giá trị. */
export default function Counter({ value, decimals }: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(() => format(0, decimals));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setDisplay(format(value, decimals)));
      return () => cancelAnimationFrame(raf);
    }

    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          const start = performance.now();
          const duration = 1100;
          const frame = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(format(value * eased, decimals));
            if (p < 1) raf = requestAnimationFrame(frame);
          };
          raf = requestAnimationFrame(frame);
        }
      },
      { threshold: 0.4 },
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, decimals]);

  return <span ref={ref}>{display}</span>;
}
