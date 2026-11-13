"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Pill, Minus, Plus } from "lucide-react"
import { POSProduct } from "@/stores/pos-products"
import { usePOSCartStore } from "@/stores/pos-cart"
import { getStockStatus } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

interface Props {
  product: POSProduct
}

const STOCK_PILL = {
  ok: "text-gray-400 bg-white/5 border-white/5",
  low: "text-amber-300 bg-amber-500/10 border-amber-500/25",
  out: "text-red-300 bg-red-500/10 border-red-500/25",
}

export default function ProductTile({ product }: Props) {
  const addItem = usePOSCartStore((s) => s.addItem)
  const inCartQty = usePOSCartStore((s) => s.items.find((i) => i.productId === product.id)?.quantity ?? 0)
  const [flash, setFlash] = useState<"teal" | "red" | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const [showQtyPicker, setShowQtyPicker] = useState(false)
  const [pickerQty, setPickerQty] = useState(1)

  const stockStatus = getStockStatus(product.stock, product.lowStockAt)
  const isOutOfStock = product.stock <= 0
  const remaining = Math.max(0, product.stock - inCartQty)

  const doFlash = (c: "teal" | "red") => {
    setFlash(c)
    setTimeout(() => setFlash(null), 350)
  }

  const handleClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    if (isOutOfStock) {
      doFlash("red")
      toast.error(`${product.nameEn} — out of stock`)
      return
    }
    const result = addItem(product)
    if (result === "added") doFlash("teal")
    else if (result === "already_max") {
      doFlash("red")
      toast.error(`Only ${product.stock} in stock`)
    }
  }

  const openPicker = () => {
    if (isOutOfStock || remaining <= 0) return
    setPickerQty(1)
    setShowQtyPicker(true)
  }

  const handlePressStart = () => {
    longPressFired.current = false
    longPressRef.current = setTimeout(() => {
      longPressFired.current = true
      openPicker()
    }, 500)
  }

  const handlePressEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current)
  }

  const handleAddWithQty = () => {
    let added = 0
    for (let i = 0; i < pickerQty; i++) {
      if (addItem(product) !== "added") break
      added++
    }
    if (added < pickerQty) toast.error(`Only ${added} could be added — stock limit`)
    setShowQtyPicker(false)
    doFlash("teal")
  }

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault()
          openPicker()
        }}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        title={`${product.nameEn}${product.brand ? ` · ${product.brand}` : ""}\nClick to add · Right-click / hold for quantity`}
        className={`
          group relative w-full h-37 flex flex-col overflow-hidden text-left
          rounded-2xl border transition-all duration-150 select-none
          ${
            isOutOfStock
              ? "bg-pos-card/60 border-pos-border cursor-not-allowed"
              : inCartQty > 0
              ? "bg-pos-card border-teal-500/50 shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_10px_30px_-12px_rgba(16,185,129,0.35)]"
              : "bg-pos-card border-pos-border hover:border-teal-500/40 hover:bg-pos-cardHover hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
          }
        `}
      >
        {/* Flash overlay */}
        {flash && (
          <div
            className={`absolute inset-0 z-10 rounded-2xl pointer-events-none ${
              flash === "teal" ? "flash-teal" : "flash-red"
            }`}
          />
        )}

        <div className={`flex flex-col flex-1 p-3 ${isOutOfStock ? "opacity-45" : ""}`}>
          {/* Top row: icon + badges */}
          <div className="flex items-start justify-between gap-1 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/15 flex items-center justify-center text-sm shrink-0">
              {product.categoryIcon ? (
                <span className="leading-none">{product.categoryIcon}</span>
              ) : (
                <Pill className="w-4 h-4 text-teal-400" />
              )}
            </div>
            {product.requiresPrescription && (
              <span className="bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-md text-[10px] font-bold px-1.5 py-0.5 leading-none">
                Rx
              </span>
            )}
          </div>

          {/* Name */}
          <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2">{product.nameEn}</p>
          <p className="text-gray-500 text-[11px] mt-0.5 truncate">
            {product.brand || product.categoryName || " "}
          </p>

          <div className="flex-1" />

          {/* Bottom row: price + stock */}
          <div className="flex items-end justify-between gap-1 mt-1">
            <div className="leading-none">
              <span className="text-[10px] text-gray-500 mr-0.5">Rs</span>
              <span className="font-mono text-[17px] font-bold text-teal-300 tabular">
                {product.sellPrice.toLocaleString("en-PK")}
              </span>
              <span className="block text-[10px] text-gray-500 mt-1">per {product.unit || "pcs"}</span>
            </div>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md border tabular ${STOCK_PILL[stockStatus]}`}
            >
              {isOutOfStock ? "Out" : stockStatus === "low" ? `Low ${product.stock}` : product.stock}
            </span>
          </div>
        </div>

        {isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500/60" />
        )}
      </motion.button>

      {/* In-cart quantity badge */}
      <AnimatePresence>
        {inCartQty > 0 && (
          <motion.span
            key={inCartQty}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="absolute -top-2 -right-2 z-10 min-w-6 h-6 px-1.5 rounded-full bg-teal-500 text-white text-xs font-bold font-mono flex items-center justify-center ring-4 ring-pos-panel shadow-lg shadow-teal-500/40 pointer-events-none"
          >
            {inCartQty}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Quantity Picker */}
      {showQtyPicker && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowQtyPicker(false)} />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 animate-pop-in">
            <div className="glass border border-pos-borderHi rounded-2xl p-3 min-w-45">
              <p className="text-gray-300 text-xs font-medium text-center mb-2 truncate max-w-40">
                {product.nameEn}
              </p>
              <div className="flex items-center justify-between gap-2 mb-3">
                <button
                  onClick={() => setPickerQty((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center bg-pos-card border border-pos-border rounded-xl text-white hover:bg-pos-cardHover"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-white text-xl font-bold w-10 text-center tabular">{pickerQty}</span>
                <button
                  onClick={() => setPickerQty((q) => Math.min(remaining, q + 1))}
                  className="w-9 h-9 flex items-center justify-center bg-pos-card border border-pos-border rounded-xl text-white hover:bg-pos-cardHover"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 mb-2">
                {[5, 10, 20].filter((n) => n <= remaining).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPickerQty(n)}
                    className="flex-1 h-7 rounded-lg text-[11px] font-mono border border-pos-border bg-pos-card text-gray-400 hover:text-white"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddWithQty}
                className="w-full h-9 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-400 transition-colors"
              >
                Add {pickerQty} · Rs {(pickerQty * product.sellPrice).toLocaleString("en-PK")}
              </button>
              <p className="text-[10px] text-gray-500 text-center mt-1.5">{remaining} available</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
