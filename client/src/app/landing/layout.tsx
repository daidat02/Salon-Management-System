import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'VietOps — Vietnam Service Operations Platform',
  description:
    'VietOps là nền tảng vận hành dịch vụ Việt Nam: gom lịch hẹn, thu ngân, kho hàng, thu chi và báo cáo về một nền tảng duy nhất cho salon & spa.',
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-landing min-h-screen bg-canvas font-sans text-ink antialiased">
      {children}
    </div>
  );
}
