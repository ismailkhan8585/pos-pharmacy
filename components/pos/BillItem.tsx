"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Minus, Plus, X } from "lucide-react"
import { CartItem, usePOSCartStore } from "@/stores/pos-cart"
import NumericKeypad from "./NumericKeypad"

interface Props {
  item: CartItem
  index?: number
}

const fmt = (n: number) => n.toLocaleString("en-PK")

export default function BillItem({ item, index }: Props) {
  const removeItem = usePOSCartStore((s) => s.removeItem)
  const updateQty = usePOSCartStore((s) => s.updateQty)
  const [showKeypad, setShowKeypad] = useState(false)
  const atMax = item.quantity >= item.maxStock

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: 16, backgroundColor: "rgba(16,185,129,0.12)" }}
        animate={{ opacity: 1, x: 0, backgroundColor: "rgba(16,185,129,0)" }}
        exit={{ opacity: 0, x: -16, height: 0 }}
        transition={{ duration: 0.2 }}
        className="group relative mx-2 my-1 px-2.5 py-2.5 rounded-xl hover:bg-white/3 transition-colors"
      >
        <div className="flex items-start gap-2.5">
          {index !== undefined && (
            <span className="mt-0.5 w-5 h-5 shrink-0 rounded-md bg-white/5 text-[10px] font-mono text-gray-500 flex items-center justify-center">
              {index}
            </span>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-[13px] font-medium truncate leading-tight">{item.nameEn}</p>
              {item.requiresPrescription && (
                <span className="text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded px-1 shrink-0">
                  Rx
                </span>
              )}
            </div>
            <p className="text-gray-500 text-[11px] font-mono mt-0.5">
              Rs {fmt(item.unitPrice)} × {item.quantity} {item.unit}
              {atMax && <span className="text-amber-400 ml-1.5">· max stock</span>}
            </p>
          </div>

          <span className="font-mono text-[14px] font-semibold text-white tabular shrink-0 mt-0.5">
            {fmt(item.totalPrice)}
          </span>
        </div>

        <div className="flex items-center justify-between mt-2 pl-7">
          {/* Stepper */}
          <div className="flex items-center h-8 rounded-lg border border-pos-border bg-pos-card overflow-hidden">
            <button
              onClick={() => updateQty(item.productId, item.quantity - 1)}
              className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title={item.quantity === 1 ? "Remove" : "Decrease"}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowKeypad(true)}
              className="min-w-10 h-full px-2 flex items-center justify-center font-mono text-sm font-semibold text-white border-x border-pos-border hover:text-teal-300 hover:bg-white/5 transition-colors tabular"
              title="Type quantity"
            >
              {item.quantity}
            </button>
            <button
              onClick={() => !atMax && updateQty(item.productId, item.quantity + 1)}
              disabled={atMax}
              className="w-8 h-full flex items-center justify-center text-gray-400 hover:bg-teal-500/10 hover:text-teal-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Increase"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => removeItem(item.productId)}
            className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 opacity-60 group-hover:opacity-100 transition-all"
            title="Remove item"
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showKeypad && (
          <NumericKeypad
            initial={item.quantity}
            max={item.maxStock}
            label={item.nameEn}
            onConfirm={(qty) => {
              updateQty(item.productId, qty)
              setShowKeypad(false)
            }}
            onClose={() => setShowKeypad(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
