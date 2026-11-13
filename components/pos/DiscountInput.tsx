"use client"

import { useState } from "react"
import { DiscountType, usePOSCartStore } from "@/stores/pos-cart"

export default function DiscountInput() {
  const discount = usePOSCartStore((s) => s.discount)
  const discountType = usePOSCartStore((s) => s.discountType)
  const setDiscount = usePOSCartStore((s) => s.setDiscount)
  const discountAmount = usePOSCartStore((s) => s.getDiscountAmount())
  const [inputValue, setInputValue] = useState(discount > 0 ? String(discount) : "")

  const switchType = (type: DiscountType) => {
    if (type === discountType) return
    setDiscount(0, type)
    setInputValue("")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, "")
    if (discountType === "PERCENTAGE" && parseFloat(val) > 100) val = "100"
    setInputValue(val)
    setDiscount(parseFloat(val) || 0, discountType)
  }

  const seg = (active: boolean) =>
    `h-full px-2.5 text-xs font-semibold transition-colors ${
      active ? "bg-teal-500/20 text-teal-300" : "text-gray-500 hover:text-gray-200"
    }`

  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 text-sm flex-1">Discount</span>

      <div className="flex items-center h-8 rounded-lg border border-pos-border bg-pos-card overflow-hidden">
        <button onClick={() => switchType("AMOUNT")} className={seg(discountType === "AMOUNT")}>
          Rs
        </button>
        <button onClick={() => switchType("PERCENTAGE")} className={`${seg(discountType === "PERCENTAGE")} border-l border-pos-border`}>
          %
        </button>
      </div>

      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        placeholder="0"
        className="w-20 h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50 text-right tabular"
      />

      <span
        className={`w-19 text-right font-mono text-sm tabular ${
          discountAmount > 0 ? "text-emerald-400" : "text-gray-600"
        }`}
      >
        −{discountAmount.toLocaleString("en-PK")}
      </span>
    </div>
  )
}
