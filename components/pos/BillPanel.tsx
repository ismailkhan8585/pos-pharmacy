"use client"

import { AnimatePresence } from "framer-motion"
import { usePOSCartStore } from "@/stores/pos-cart"
import { Receipt, Trash2 } from "lucide-react"
import BillItem from "./BillItem"
import DiscountInput from "./DiscountInput"
import PaymentMethods from "./PaymentMethods"
import MainCTAButton from "./MainCTAButton"

interface Props {
  onCheckout: () => void
  onHold: () => void
  onReturn: () => void
}

export default function BillPanel({ onCheckout, onHold, onReturn }: Props) {
  const {
    items,
    getSubtotal,
    getDiscountAmount,
    getTotal,
    getItemCount,
    getTotalQty,
    getBillNumber,
    clearCart,
    hasRxItems,
  } = usePOSCartStore()

  const subtotal = getSubtotal()
  const discountAmount = getDiscountAmount()
  const total = getTotal()
  const itemCount = getItemCount()
  const totalQty = getTotalQty()

  return (
    <div className="flex flex-col h-full">
      {/* Bill Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-pos-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-teal-400" />
          <span className="font-grotesk font-semibold text-white text-sm">CURRENT BILL</span>
          <span className="font-mono text-xs text-gray-500">{getBillNumber()}</span>
        </div>

        <div className="flex items-center gap-1">
          {hasRxItems() && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded px-1.5 py-0.5">
              Rx
            </span>
          )}
          {items.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Clear bill?")) clearCart()
              }}
              className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
              title="Clear bill"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-pos-card border border-pos-border flex items-center justify-center">
              <Receipt className="w-7 h-7 text-gray-700" />
            </div>
            <div>
              <p className="text-gray-600 text-sm font-medium">Bill is empty</p>
              <p className="text-gray-700 text-xs mt-1">Tap a product to add it</p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <BillItem key={item.productId} item={item} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <>
          <div className="px-3 py-2 border-t border-pos-border flex-shrink-0">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Items: {itemCount} · Qty: {totalQty}</span>
              <span className="font-mono">Subtotal: Rs.{subtotal}</span>
            </div>
          </div>

          {/* Discount */}
          <div className="border-t border-pos-border flex-shrink-0">
            <DiscountInput />
          </div>

          {/* Total */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-pos-border flex-shrink-0">
            <span className="font-grotesk font-bold text-white text-sm">TOTAL</span>
            <span className="font-mono text-xl font-bold text-teal-400">Rs.{total}</span>
          </div>

          {/* Payment */}
          <div className="border-t border-pos-border flex-shrink-0">
            <PaymentMethods />
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-1.5 px-3 pb-2 flex-shrink-0">
            <button
              onClick={onHold}
              className="flex-1 h-9 rounded-xl bg-pos-card border border-pos-border text-gray-400 text-xs font-medium hover:text-white hover:bg-pos-cardHover transition-all duration-150"
            >
              📋 Hold
            </button>
            <button
              onClick={() => clearCart()}
              className="flex-1 h-9 rounded-xl bg-pos-card border border-pos-border text-gray-400 text-xs font-medium hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all duration-150"
            >
              ✕ Clear
            </button>
            <button
              onClick={onReturn}
              className="flex-1 h-9 rounded-xl bg-pos-card border border-pos-border text-gray-400 text-xs font-medium hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-150"
            >
              ↩ Return
            </button>
          </div>
        </>
      )}

      {/* Return button (when empty) */}
      {items.length === 0 && (
        <div className="px-3 pb-3 flex-shrink-0 border-t border-pos-border pt-3">
          <button
            onClick={onReturn}
            className="w-full h-9 rounded-xl bg-pos-card border border-pos-border text-gray-400 text-xs font-medium hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all duration-150"
          >
            ↩ Process Return
          </button>
        </div>
      )}

      {/* Checkout Button */}
      <div className="border-t border-pos-border flex-shrink-0">
        <MainCTAButton onCheckout={onCheckout} />
      </div>
    </div>
  )
}
