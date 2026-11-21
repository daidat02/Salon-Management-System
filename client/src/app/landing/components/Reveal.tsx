'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: ReactNode;
  /** Độ trễ hiệu ứng (giây). */
  delay?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Bọc nội dung để fade/slide-in khi cuộn tới.
 * Tôn trọng `prefers-reduced-motion` và môi trường không có IntersectionObserver.
 */
export default function Reveal({ children, delay = 0, className, style }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: globals.css đã ép .reveal hiện sẵn, không cần setState.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (typeof IntersectionObserver === 'undefined') {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('reveal', visible && 'is-visible', className)}
      style={delay ? { transitionDelay: `${delay}s`, ...style } : style}
    >
      {children}
    </div>
  );
}
