"use client"

import * as React from "react"
import { cn } from "cn"

type TextButtonProps = React.ComponentProps<"button"> & {
  tone?: "primary" | "danger"
}

/** Nút text nhỏ (10px, hover gạch dưới) cho tác vụ dòng trong bảng. */
export function TextButton({
  tone = "primary",
  children,
  className,
  ...props
}: TextButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
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
