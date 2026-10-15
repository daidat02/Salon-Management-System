"use client"

import * as React from "react"
import { cn } from "cn"

/** Nút text nhỏ (10px, hover gạch dưới) cho tác vụ dòng trong bảng. */
export function TextButton({
  title,
  onClick,
  tone = "primary",
  children,
  className,
}: {
  title?: string
  onClick?: (e: React.MouseEvent) => void
  tone?: "primary" | "danger"
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "shrink-0 text-[10px] font-medium hover:underline",
        tone === "danger" ? "text-error" : "text-primary",
        className,
      )}
    >
      {children}
    </button>
  )
}
