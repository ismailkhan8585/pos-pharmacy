"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ReceiptText, Trash2, PauseCircle, Undo2, UserPlus, UserRound, X, ShoppingCart } from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"
import BillItem from "./BillItem"
import DiscountInput from "./DiscountInput"
import MainCTAButton from "./MainCTAButton"

interface Props {
  onCheckout: () => void
  onHold: () => void
  onReturn: () => void
}

const fmt = (n: number) => n.toLocaleString("en-PK")

export default function BillPanel({ onCheckout, onHold, onReturn }: Props) {
  const items = usePOSCartStore((s) => s.items)
  const customerName = usePOSCartStore((s) => s.customerName)
  const customerPhone = usePOSCartStore((s) => s.customerPhone)
  // subscribe to discount fields so totals re-render
  usePOSCartStore((s) => s.discount)
  usePOSCartStore((s) => s.discountType)
  const { getSubtotal, getDiscountAmount, getTotal, getTotalQty, getBillNumber, clearCart, hasRxItems, setCustomer } =
    usePOSCartStore.getState()

  const [confirmClear, setConfirmClear] = useState(false)
  const [showCustomer, setShowCustomer] = useState(false)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(items.length)

  const subtotal = getSubtotal()
  const discountAmount = getDiscountAmount()
  const total = getTotal()
  const totalQty = getTotalQty()
  const isEmpty = items.length === 0

  // Scroll to the newest line when an item is added
  useEffect(() => {
    if (items.length > prevCount.current) listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    prevCount.current = items.length
  }, [items.length])

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
  }, [])

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      clearTimer.current = setTimeout(() => setConfirmClear(false), 3000)
      return
    }
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setConfirmClear(false)
    setShowCustomer(false)
    clearCart()
  }

  const hasCustomer = !!(customerName || customerPhone)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-pos-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <ReceiptText className="w-4 h-4 text-teal-400" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-grotesk font-semibold text-white text-sm">Current Sale</p>
            <p className="font-mono text-[11px] text-gray-500">
              {getBillNumber()}
              {!isEmpty && (
                <>
                  {" · "}
                  {items.length} item{items.length > 1 ? "s" : ""} · {totalQty} units
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasRxItems() && (
            <span
              className="text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md px-1.5 py-1 leading-none"
              title="Bill contains prescription medicines"
            >
              Rx
            </span>
          )}
          {!isEmpty && (
            <button
              onClick={handleClear}
              className={`flex items-center gap-1.5 h-8 rounded-lg text-xs font-medium transition-all duration-150 ${
                confirmClear
                  ? "px-2.5 bg-red-500/15 text-red-300 border border-red-500/40"
                  : "w-8 justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10"
              }`}
              title="Clear bill"
            >
              <Trash2 className="w-4 h-4" />
              {confirmClear && "Clear all?"}
            </button>
          )}
        </div>
      </div>

      {/* Customer (optional) */}
      <div className="px-4 py-2.5 border-b border-pos-border shrink-0">
        {showCustomer ? (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
            <input
              autoFocus
              value={customerName}
              onChange={(e) => setCustomer(e.target.value, customerPhone)}
              placeholder="Customer name"
              className="flex-1 min-w-0 h-9 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-500 focus:border-teal-500/50"
            />
            <input
              value={customerPhone}
              onChange={(e) => setCustomer(customerName, e.target.value.replace(/[^0-9+\- ]/g, ""))}
              placeholder="03xx-xxxxxxx"
              inputMode="tel"
              className="w-30 h-9 px-3 bg-pos-card border border-pos-border rounded-xl text-sm font-mono text-white placeholder-gray-500 focus:border-teal-500/50"
            />
            <button
              onClick={() => setShowCustomer(false)}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-pos-card"
              title="Done"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowCustomer(true)}
            className="w-full flex items-center gap-2 h-9 px-3 rounded-xl border border-dashed border-pos-border text-xs text-gray-500 hover:text-gray-200 hover:border-pos-borderHi transition-colors"
          >
            {hasCustomer ? (
              <>
                <UserRound className="w-4 h-4 text-teal-400" />
                <span className="text-gray-200 font-medium truncate">{customerName || "Customer"}</span>
                {customerPhone && <span className="font-mono text-gray-500">{customerPhone}</span>}
                <span className="ml-auto text-[10px] text-gray-500">Edit</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add customer <span className="text-gray-600">(optional)</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-teal-500/10 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl surface flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 text-gray-500" />
              </div>
            </div>
            <div>
              <p className="text-gray-200 text-sm font-semibold">No items yet</p>
              <p className="text-gray-500 text-xs mt-1 leading-relaxed">
                Tap a product, or scan a barcode
                <br />
                into the search box and press <span className="kbd">Enter</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="py-1">
            <AnimatePresence initial={false}>
              {items.map((item, idx) => (
                <BillItem key={item.productId} item={item} index={idx + 1} />
              ))}
            </AnimatePresence>
            <div ref={listEndRef} />
          </div>
        )}
      </div>

      {/* Summary */}
      {!isEmpty && (
        <div className="px-4 pt-3 pb-1 border-t border-pos-border shrink-0 space-y-2 bg-pos-bg/40">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="font-mono text-gray-200 tabular">Rs {fmt(subtotal)}</span>
          </div>

          <DiscountInput />

          <div className="flex items-end justify-between pt-2 border-t border-dashed border-pos-border">
            <div className="leading-tight">
              <span className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">Total</span>
              {discountAmount > 0 && (
                <p className="text-[11px] text-emerald-400 mt-0.5">You save Rs {fmt(discountAmount)}</p>
              )}
            </div>
            <span className="font-mono text-[28px] leading-none font-bold text-white tabular">
              <span className="text-base text-gray-500 font-medium mr-1">Rs</span>
              {fmt(total)}
            </span>
          </div>
        </div>
      )}

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 shrink-0">
        <button
          onClick={onHold}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-pos-card border border-pos-border text-gray-300 text-xs font-medium hover:text-white hover:border-pos-borderHi transition-all duration-150"
        >
          <PauseCircle className="w-4 h-4 text-sky-400" />
          {isEmpty ? "Held Bills" : "Hold"}
          <span className="kbd">F4</span>
        </button>
        <button
          onClick={onReturn}
          className="flex items-center justify-center gap-2 h-10 rounded-xl bg-pos-card border border-pos-border text-gray-300 text-xs font-medium hover:text-amber-300 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all duration-150"
        >
          <Undo2 className="w-4 h-4 text-amber-400" />
          Return
          <span className="kbd">F8</span>
        </button>
      </div>

      {/* Checkout */}
      <MainCTAButton onCheckout={onCheckout} />
    </div>
  )
}
