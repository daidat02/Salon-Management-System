'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

/**
 * Nút quay lại dùng trong PageHeading. Chỉ nhận props serializable
 * (label/href) nên page Server Component vẫn dùng được.
 * Không href -> router.back().
 */
export default function PageHeadingBackButton({ label, href }: { label?: string; href?: string }) {
  const router = useRouter();
  const text = label ?? 'Quay lại';

  if (href) {
    return (
      <Link
        href={href}
        className="mb-1 inline-flex items-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" />
        {text}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-1 inline-flex items-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      <ArrowLeft className="h-4 w-4" />
      {text}
    </button>
  );
}
