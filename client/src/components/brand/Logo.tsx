import { cn } from '@/lib/utils';

type LogoProps = {
  /** Kích thước ô mark. */
  size?: 'sm' | 'md';
  /** Hiện wordmark VietOps cạnh mark. */
  withText?: boolean;
  /** Dòng phụ dưới wordmark; `null` để ẩn. */
  subtitle?: string | null;
  className?: string;
  markClassName?: string;
};

const MARK_SIZES = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
} as const;

/** Mark VietOps dùng chung cho landing và dashboard. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M4 7h10a4 4 0 0 1 0 8H8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="17" r="2.4" fill="currentColor" />
      <circle cx="20" cy="7" r="2.4" fill="currentColor" opacity=".65" />
    </svg>
  );
}

/**
 * Logo thương hiệu VietOps — dùng ở landing header/footer và dashboard.
 * Màu lấy từ token `brand` của theme đang bọc (app hoặc landing).
 */
export default function Logo({
  size = 'md',
  withText = true,
  subtitle = 'Service Operations',
  className,
  markClassName,
}: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex items-center justify-center rounded-custom bg-brand text-white shadow-sm',
          MARK_SIZES[size],
          markClassName,
        )}
      >
        <LogoMark />
      </span>
      {withText && (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-[17px] font-extrabold tracking-tight text-ink">
            VietOps
          </span>
          {subtitle && (
            <span className="whitespace-nowrap text-[10px] font-medium tracking-[0.14em] text-[#64748b] uppercase">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
