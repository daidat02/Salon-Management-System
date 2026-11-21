'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const FIELDS = [
  { id: 'fullname', name: 'fullname', label: 'Họ và tên', type: 'text', placeholder: 'vd: Nguyễn Đại Đạt' },
  {
    id: 'phone',
    name: 'phone',
    label: 'Số điện thoại',
    type: 'tel',
    placeholder: 'vd: 0901 234 567',
  },
  { id: 'salon', name: 'salon', label: 'Tên salon', type: 'text', placeholder: 'vd: Mộc Hair & Spa' },
] as const;

export default function DemoForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-custom border border-success/30 bg-success/10 p-4 text-sm text-ink">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        <span>Đã ghi nhận! Đây là bản preview nên chưa có dữ liệu nào được gửi đi.</span>
      </div>
    );
  }

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      {FIELDS.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.id} className="mb-1.5 block text-sm font-semibold text-ink">
            {field.label}
          </label>
          <input
            id={field.id}
            name={field.name}
            type={field.type}
            required
            placeholder={field.placeholder}
            className="w-full rounded-custom border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
          />
        </div>
      ))}
      <button
        type="submit"
        className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-custom bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Nhận tư vấn &amp; dùng thử
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="text-center text-xs text-muted" role="status" aria-live="polite">
        Bản preview: form chỉ mô phỏng, không gửi dữ liệu thật.
      </p>
    </form>
  );
}
