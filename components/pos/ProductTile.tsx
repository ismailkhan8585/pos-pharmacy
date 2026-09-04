"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { POSProduct } from "@/stores/pos-products"
import { usePOSCartStore } from "@/stores/pos-cart"
import { getStockStatus, getStockStripClass } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

interface Props {
  product: POSProduct
}

export default function ProductTile({ product }: Props) {
  const { addItem } = usePOSCartStore()
  const [isFlashing, setIsFlashing] = useState<"teal" | "red" | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showQtyPicker, setShowQtyPicker] = useState(false)
  const [pickerQty, setPickerQty] = useState(1)

  const stockStatus = getStockStatus(product.stock, product.lowStockAt)
  const stripClass = getStockStripClass(stockStatus)
  const isOutOfStock = product.stock <= 0

  const handleClick = () => {
    if (isOutOfStock) {
      setIsFlashing("red")
      setTimeout(() => setIsFlashing(null), 300)
      toast.error(`${product.nameEn} — Out of stock`)
      return
    }

    const result = addItem(product)
    if (result === "added") {
      setIsFlashing("teal")
      setTimeout(() => setIsFlashing(null), 200)
    } else if (result === "already_max") {
      toast.error("Max stock reached")
    }
  }

  const handleLongPressStart = () => {
    longPressRef.current = setTimeout(() => {
      if (!isOutOfStock) {
        setShowQtyPicker(true)
        setPickerQty(1)
      }
    }, 500)
  }

  const handleLongPressEnd = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current)
    }
  }

  const handleAddWithQty = () => {
    for (let i = 0; i < pickerQty; i++) {
      const result = addItem(product)
      if (result === "already_max") break
    }
    setShowQtyPicker(false)
  }

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        onMouseDown={handleLongPressStart}
        onMouseUp={handleLongPressEnd}
        onMouseLeave={handleLongPressEnd}
        onTouchStart={handleLongPressStart}
        onTouchEnd={handleLongPressEnd}
        className={`
          relative w-full flex flex-col overflow-hidden
          rounded-xl border cursor-pointer
          transition-all duration-150 text-left
          min-h-[136px]
          ${
            isOutOfStock
              ? "bg-pos-card border-pos-border opacity-60"
              : "bg-pos-card border-pos-border hover:border-teal-500/40 hover:bg-pos-cardHover hover:shadow-lg hover:shadow-teal-500/10 hover:-translate-y-0.5"
          }
        `}
      >
        {/* Flash overlay */}
        {isFlashing && (
          <div
            className={`absolute inset-0 z-10 rounded-xl pointer-events-none ${
              isFlashing === "teal" ? "flash-teal" : "flash-red"
            }`}
          />
        )}

        {/* Stock strip (top) */}
        <div className={`h-1 w-full ${stripClass} flex-shrink-0`} />

        {/* Rx badge */}
        {product.requiresPrescription && (
          <div className="absolute top-2 right-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded text-[9px] font-bold px-1 py-0.5 leading-none">
            Rx
          </div>
        )}

        {/* Content */}
        <div className="flex flex-col flex-1 p-2.5 pt-2">
          <p className="text-white text-[13px] font-medium leading-tight line-clamp-2 pr-4">
            {product.nameEn}
          </p>
          {product.brand && (
            <p className="text-gray-600 text-[10px] mt-0.5 truncate">{product.brand}</p>
          )}

          <div className="flex-1" />

          {/* Bottom row: price + stock */}
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-mono text-sm font-bold text-teal-400">
              Rs.{product.sellPrice}
            </span>

            <span
              className={`font-mono text-[10px] ${
                stockStatus === "ok"
                  ? "text-gray-600"
                  : stockStatus === "low"
                  ? "text-amber-400 animate-pulse"
                  : "text-red-400"
              }`}
            >
              {product.stock <= 0 ? "0" : product.stock}
            </span>
          </div>
        </div>
      </motion.button>

      {/* Long-press Qty Picker */}
      {showQtyPicker && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 animate-pop-in">
          <div className="bg-pos-modal border border-pos-border rounded-xl p-3 shadow-2xl shadow-black/50 min-w-[160px]">
            <p className="text-gray-500 text-[10px] text-center mb-2 truncate">{product.nameEn}</p>
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setPickerQty((q) => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center bg-pos-card rounded-lg text-white hover:bg-pos-cardHover transition-colors"
              >
                −
              </button>
              <span className="font-mono text-white text-lg w-8 text-center">{pickerQty}</span>
              <button
                onClick={() => setPickerQty((q) => Math.min(product.stock, q + 1))}
                className="w-8 h-8 flex items-center justify-center bg-pos-card rounded-lg text-white hover:bg-pos-cardHover transition-colors"
              >
                +
              </button>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowQtyPicker(false)}
                className="flex-1 h-8 rounded-lg text-gray-500 text-xs hover:bg-pos-card transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWithQty}
                className="flex-1 h-8 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600 transition-colors"
              >
                Add {pickerQty}
              </button>
            </div>
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-pos-border rotate-45 mx-auto -mt-1 border-r border-b border-pos-border" />
        </div>
      )}

      {/* Close picker on outside click */}
      {showQtyPicker && (
        <div className="fixed inset-0 z-10" onClick={() => setShowQtyPicker(false)} />
      )}
    </div>
  )
}
