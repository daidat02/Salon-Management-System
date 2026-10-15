"use client"

import * as React from "react"
import axios from "axios"
import { ChevronDown, Loader2, Minus, Plus, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { getCustomerByPhone, normalizePhone } from "@/services/customer"
import type { Customer } from "@/types/customer"
import type { CatalogItem } from "./ServiceCatalog"

export type InvoiceItem = CatalogItem & { quantity: number; dotColor: string }

export type SelectedCustomer = Pick<Customer, "id" | "full_name" | "phone"> | null

export type NewCustomerDraft = { full_name: string; phone: string }

type Props = {
  items: InvoiceItem[]
  onQuantity: (id: string, delta: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  onCheckout: () => void
  customer: SelectedCustomer
  onCustomerChange: (customer: SelectedCustomer) => void
  newCustomer: NewCustomerDraft | null
  onNewCustomerChange: (draft: NewCustomerDraft | null) => void
  isPending?: boolean
  error?: string | null
  /** Chế độ thêm món vào đơn có sẵn: đổi tiêu đề thành mã đơn + ẩn chọn khách. */
  title?: string
  tagText?: string
  hideCustomer?: boolean
  submitLabel?: string
  pendingLabel?: string
}

function formatPrice(n: number) {
  return n.toLocaleString("vi-VN") + " đ"
}

export default function InvoicePanel({
  items,
  onQuantity,
  onRemove,
  onClear,
  onCheckout,
  customer,
  onCustomerChange,
  newCustomer,
  onNewCustomerChange,
  isPending,
  error,
  title = "Hóa đơn mới",
  tagText = "Đang tạo",
  hideCustomer = false,
  submitLabel = "Tạo đơn",
  pendingLabel = "Đang tạo...",
}: Props) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [findPhone, setFindPhone] = React.useState("")

  const isNewMode = newCustomer !== null
  const lookupRaw = isNewMode ? (newCustomer?.phone || "") : findPhone

  // Tra cứu SĐT qua API GET /customers/phone.
  const [isPhoneLookupLoading, setIsPhoneLookupLoading] = React.useState(false)
  const [lookupMsg, setLookupMsg] = React.useState<{ kind: "not-found" | "error"; text: string } | null>(null)

  const headerName = customer?.full_name ?? (newCustomer?.full_name || "Khách lẻ (Walk-in)")
  const headerPhone = customer?.phone ?? (newCustomer?.phone || "")

  // Tìm chính xác theo SĐT: thấy thì gắn khách cũ vào đơn,
  // không thấy (404) thì báo + gợi thêm khách mới.
  const handleFindByPhone = async () => {
    const target = normalizePhone(lookupRaw)
    if (!target || isPhoneLookupLoading) return
    setIsPhoneLookupLoading(true)
    setLookupMsg(null)
    try {
      const found = await getCustomerByPhone(target)
      onCustomerChange({ id: found.id, full_name: found.full_name, phone: found.phone })
      onNewCustomerChange(null)
      setFindPhone("")
      setPickerOpen(false)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setLookupMsg({
          kind: "not-found",
          text: `Không tìm thấy khách với SĐT ${target} — bấm + Thêm khách mới để tạo.`,
        })
      } else {
        setLookupMsg({ kind: "error", text: "Tra cứu thất bại, thử lại sau." })
      }
    } finally {
      setIsPhoneLookupLoading(false)
    }
  }

  const handleAddNewWithPhone = () => {
    onCustomerChange(null)
    onNewCustomerChange({ full_name: "", phone: findPhone })
    setLookupMsg(null)
  }

  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  const canCheckout = items.length > 0 && !isPending

  return (
    <section className="bg-surface border-outline flex w-full shrink-0 flex-col overflow-hidden rounded-md border shadow-sm lg:sticky lg:top-4 lg:h-[calc(100dvh-64px)] lg:max-h-[calc(100dvh-64px)] lg:w-[440px] xl:w-[480px]">
      {/* Header + picker khách hàng */}
      <div className="bg-surface-container-low border-outline flex shrink-0 flex-col gap-1 border-b px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <h2 className="text-[13px] font-bold leading-none text-on-surface">{title}</h2>
            <Tag variant="warning" size="sm" shape="rounded" className="px-1.5 py-0 text-[10px] leading-none">
              {tagText}
            </Tag>
          </div>
          {/* Nút khách hàng -> mở div bên dưới (ẩn ở chế độ thêm món vào đơn có sẵn) */}
          {!hideCustomer && (
          <div className="min-w-0 flex-1 sm:max-w-[240px]">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-md border border-outline bg-white px-2 py-1.5 text-left hover:border-primary"
            >
              <UserPlus className="text-primary h-3 w-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-[11px] font-bold leading-none text-on-surface">
                {customer ? (
                  headerName
                ) : isNewMode && newCustomer?.full_name ? (
                  <>{headerName}<span className="font-normal text-success"> (mới)</span></>
                ) : (
                  <span className="font-semibold text-primary">+ Thêm khách hàng</span>
                )}
              </span>
              {headerPhone && (customer || isNewMode) && (
                <span className="text-on-surface-variant hidden truncate text-[10px] leading-none md:inline">
                  {headerPhone}
                </span>
              )}
              <ChevronDown
                className={`h-3 w-3 shrink-0 text-on-surface-variant transition-transform ${pickerOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          )}
        </div>
        {/* Div tìm / thêm khách ngay bên dưới header (ẩn ở chế độ thêm món) */}
        {!hideCustomer && pickerOpen && (
          <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-1.5">
            {customer && (
              <div className="mb-1 flex items-center justify-between rounded bg-white px-1.5 py-1">
                <span className="min-w-0 truncate text-[10px] font-semibold text-on-surface">
                  {customer.full_name} <span className="font-normal text-on-surface-variant">{customer.phone}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onCustomerChange(null)
                    setFindPhone("")
                    setLookupMsg(null)
                  }}
                  className="shrink-0 text-[10px] font-medium text-error hover:underline"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            {/* Đã gắn khách vào đơn thì ẩn ô nhập, chỉ hiện thẻ khách + Bỏ chọn */}
            {!customer && (
            <>
            <div className="flex items-center gap-1">
              <input
                value={isNewMode ? (newCustomer?.phone || "") : findPhone}
                onChange={(e) => {
                  setLookupMsg(null)
                  return isNewMode
                    ? onNewCustomerChange({ full_name: newCustomer?.full_name || "", phone: e.target.value })
                    : setFindPhone(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleFindByPhone()
                  }
                }}
                placeholder="Nhập SĐT..."
                inputMode="tel"
                className="min-w-0 flex-1 rounded border border-outline bg-white px-1.5 py-1 text-[10px] text-on-surface focus:border-primary focus:outline-none"
              />
              {isNewMode && (
                <input
                  value={newCustomer?.full_name || ""}
                  onChange={(e) =>
                    onNewCustomerChange({ full_name: e.target.value, phone: newCustomer?.phone || "" })
                  }
                  placeholder="Tên khách mới..."
                  className="min-w-0 flex-1 rounded border border-outline bg-white px-1.5 py-1 text-[10px] text-on-surface focus:border-primary focus:outline-none"
                />
              )}
              <button
                type="button"
                onClick={() => void handleFindByPhone()}
                disabled={isPhoneLookupLoading}
                className="flex shrink-0 items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-50"
              >
                {isPhoneLookupLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                Tìm
              </button>
            </div>
            {lookupMsg && (
              <p
                className={`mt-1 text-[10px] leading-snug font-medium ${
                  lookupMsg.kind === "not-found" ? "text-warning" : "text-error"
                }`}
              >
                {lookupMsg.text}
              </p>
            )}
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[10px] text-on-surface-variant">
                {isNewMode
                  ? "Nhập tên, server tự tạo khách mới (bấm Tìm để dùng khách cũ nếu SĐT đã có)."
                  : "Mặc định tìm khách đã có theo SĐT."}
              </span>
              {isNewMode ? (
                <button
                  type="button"
                  onClick={() => {
                    onNewCustomerChange(null)
                    setLookupMsg(null)
                  }}
                  className="shrink-0 text-[10px] font-medium text-primary hover:underline"
                >
                  Tìm khách hàng cũ
                </button>
              ) : lookupMsg?.kind === "not-found" ? (
                <button
                  type="button"
                  onClick={handleAddNewWithPhone}
                  className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
                >
                  + Thêm khách mới với SĐT này
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onCustomerChange(null)
                    onNewCustomerChange({ full_name: "", phone: findPhone })
                    setLookupMsg(null)
                  }}
                  className="shrink-0 text-[10px] font-semibold text-primary hover:underline"
                >
                  + Thêm khách mới
                </button>
              )}
            </div>
            </>
            )}
          </div>
        )}
        <p className="text-on-surface-variant text-[10px] leading-none">Hôm nay - Máy POS 01</p>
      </div>

      {/* Items - chiếm hết không gian còn lại */}
      <div className="custom-scroll flex-1 min-h-[180px] overflow-y-auto px-2.5 py-2">
        {items.length === 0 ? (
          <div className="py-10 text-center text-xs text-on-surface-variant">Chưa có sản phẩm — chọn bên trái để thêm</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((it) => (
              <div key={it.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.dotColor}`} />
                      <h4 className="text-[11px] font-bold leading-none text-on-surface line-clamp-1">{it.name}</h4>
                    </div>
                    <p className="text-on-surface-variant pl-2.5 text-[10px] leading-none">{it.desc}</p>
                  </div>
                  <button onClick={() => onRemove(it.id)} className="shrink-0 p-0.5 text-slate-400 transition-colors hover:text-error">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between pl-2.5">
                  <span className="text-primary text-[10px] font-semibold">{formatPrice(it.price)}</span>
                  <div className="flex items-center gap-1">
                    <div className="border-outline flex items-center rounded border bg-white">
                      <button onClick={() => onQuantity(it.id, -1)} className="hover:bg-slate-100 flex h-5 w-5 items-center justify-center rounded-l text-on-surface-variant">
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="w-6 text-center text-[11px] font-bold text-on-surface">{it.quantity}</span>
                      <button onClick={() => onQuantity(it.id, 1)} className="hover:bg-slate-100 flex h-5 w-5 items-center justify-center rounded-r text-on-surface-variant">
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                    <span className="w-20 text-right text-[11px] font-bold text-on-surface">{formatPrice(it.price * it.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary - chỉ giá tạm tính */}
      <div className="bg-surface-container-low border-outline flex shrink-0 flex-col gap-2 border-t px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-on-surface">Tạm tính ({items.length} mục)</span>
          <span className="text-primary font-mono text-lg font-extrabold tracking-tight">{formatPrice(subtotal)}</span>
        </div>
        <p className="text-on-surface-variant text-[11px] leading-none">Chưa bao gồm khuyến mãi - thanh toán tại Đơn hàng</p>
        {error && <p className="text-[11px] font-medium leading-snug text-error">{error}</p>}
      </div>

      {/* Actions - cao hơn, đổi thành Tạo đơn */}
      <div className="bg-surface-container-low border-outline flex shrink-0 gap-2 border-t px-3 py-3">
        <Button
          variant="outline"
          onClick={onClear}
          disabled={isPending}
          className="bg-white border-outline text-on-surface-variant hover:text-error hover:border-red-200 hover:bg-red-50 h-10 px-4 text-sm font-medium"
        >
          <X className="h-4 w-4" /> Hủy đơn
        </Button>
        <Button
          onClick={onCheckout}
          disabled={!canCheckout}
          className="flex h-10 flex-1 items-center justify-center gap-2 text-sm font-bold shadow-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {pendingLabel}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {submitLabel}
            </>
          )}
        </Button>
      </div>
    </section>
  )
}
