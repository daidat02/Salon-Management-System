import { CheckCircle2 } from 'lucide-react';
import DemoForm from './DemoForm';
import Reveal from './Reveal';

const BENEFITS = [
  'Miễn phí 14 ngày, đầy đủ tính năng',
  'Không cần thẻ tín dụng',
  'Hỗ trợ tiếng Việt qua Zalo',
];

export default function FinalCtaSection() {
  return (
    <section id="dung-thu" className="border-t border-line bg-gradient-to-b from-brand-light/60 to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <Reveal>
          <span className="text-xs font-bold tracking-[0.16em] text-brand uppercase">
            Bắt đầu hôm nay
          </span>
          <h2 className="mt-3 font-display text-[30px] leading-tight font-extrabold tracking-tight text-ink sm:text-[40px]">
            Đưa salon của bạn lên một màn hình
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Để lại thông tin, đội ngũ VietOps sẽ liên hệ tư vấn và tạo tài khoản dùng thử cho salon
            của bạn.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-muted">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.08} className="rounded-xl2 border border-line bg-white p-6 shadow-lift sm:p-8">
          <DemoForm />
        </Reveal>
      </div>
    </section>
  );
}
