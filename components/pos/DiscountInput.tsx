"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { DiscountType, usePOSCartStore } from "@/stores/pos-cart"
import { Percent, DollarSign, Check } from "lucide-react"

export default function DiscountInput() {
  const { discount, discountType, setDiscount, getSubtotal } = usePOSCartStore()
  const [inputValue, setInputValue] = useState(discount > 0 ? String(discount) : "")

  const handleTypeToggle = () => {
    const newType: DiscountType = discountType === "AMOUNT" ? "PERCENTAGE" : "AMOUNT"
    setDiscount(0, newType)
    setInputValue("")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "")
    setInputValue(val)
    const num = parseFloat(val) || 0
    setDiscount(num, discountType)
  }

  const subtotal = getSubtotal()
  const discountAmount =
    discountType === "PERCENTAGE"
      ? Math.round((subtotal * Math.min(discount, 100)) / 100)
      : Math.min(discount, subtotal)

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs flex-shrink-0">Discount:</span>

        {/* Type Toggle */}
        <button
          onClick={handleTypeToggle}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all duration-150 flex-shrink-0 ${
            discountType === "AMOUNT"
              ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
              : "bg-purple-500/10 text-purple-400 border-purple-500/30"
          }`}
        >
          {discountType === "AMOUNT" ? (
            <>
              <span className="font-mono">Rs.</span>
            </>
          ) : (
            <>
              <Percent className="w-3 h-3" />
            </>
          )}
        </button>

        {/* Input */}
        <input
          type="number"
          value={inputValue}
          onChange={handleChange}
          min={0}
          max={discountType === "PERCENTAGE" ? 100 : subtotal}
          placeholder="0"
          className="flex-1 h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-sm text-white font-mono placeholder-gray-700 outline-none focus:border-teal-500/50 text-center"
        />

        {/* Saved amount */}
        {discountAmount > 0 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-teal-400 text-xs font-mono flex-shrink-0"
          >
            -Rs.{discountAmount}
          </motion.span>
        )}
      </div>
    </div>
  )
}
