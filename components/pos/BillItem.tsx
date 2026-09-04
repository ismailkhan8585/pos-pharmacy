"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Minus, Plus, X, Hash } from "lucide-react"
import { CartItem, usePOSCartStore } from "@/stores/pos-cart"
import NumericKeypad from "./NumericKeypad"

interface Props {
  item: CartItem
}

export default function BillItem({ item }: Props) {
  const { removeItem, updateQty } = usePOSCartStore()
  const [showKeypad, setShowKeypad] = useState(false)

  const handleDecrement = () => {
    updateQty(item.productId, item.quantity - 1)
  }

  const handleIncrement = () => {
    if (item.quantity >= item.maxStock) return
    updateQty(item.productId, item.quantity + 1)
  }

  const handleQtyChange = (qty: number) => {
    updateQty(item.productId, qty)
    setShowKeypad(false)
  }

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-2 py-2.5 px-3 border-b border-[rgb(26,26,30)] last:border-0 group"
      >
        {/* Product name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-white text-[13px] truncate leading-tight">{item.nameEn}</p>
            {item.requiresPrescription && (
              <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded px-1 flex-shrink-0">
                Rx
              </span>
            )}
          </div>
          <p className="text-gray-600 text-[10px] font-mono mt-0.5">
            Rs.{item.unitPrice} / {item.unit}
          </p>
        </div>

        {/* Qty Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleDecrement}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-all duration-100"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowKeypad(true)}
            className="w-8 h-7 flex items-center justify-center font-mono text-sm text-white hover:text-teal-400 transition-colors"
            title="Edit quantity"
          >
            {item.quantity}
          </button>

          <button
            onClick={handleIncrement}
            disabled={item.quantity >= item.maxStock}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:bg-teal-500/10 hover:text-teal-400 transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total */}
        <span className="font-mono text-sm text-teal-400 w-14 text-right flex-shrink-0">
          Rs.{item.totalPrice}
        </span>

        {/* Remove */}
        <button
          onClick={() => removeItem(item.productId)}
          className="w-5 h-5 flex items-center justify-center text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* Numeric Keypad Modal */}
      <AnimatePresence>
        {showKeypad && (
          <NumericKeypad
            initial={item.quantity}
            max={item.maxStock}
            label={`Qty: ${item.nameEn}`}
            onConfirm={handleQtyChange}
            onClose={() => setShowKeypad(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
