"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePOSCartStore } from "@/stores/pos-cart"
import { Printer, ShoppingBag } from "lucide-react"

interface Props {
  onCheckout: () => void
}

export default function MainCTAButton({ onCheckout }: Props) {
  const { isEmpty, getTotal, getItemCount, getTotalQty } = usePOSCartStore()

  const empty = isEmpty()
  const total = getTotal()
  const itemCount = getItemCount()
  const totalQty = getTotalQty()

  return (
    <div className="p-3 flex-shrink-0">
      <motion.button
        whileTap={!empty ? { scale: 0.98 } : {}}
        onClick={!empty ? onCheckout : undefined}
        className={`
          relative w-full h-[60px] rounded-xl overflow-hidden
          flex flex-col items-center justify-center
          transition-all duration-200
          ${
            empty
              ? "opacity-30 cursor-not-allowed bg-pos-card border border-pos-border"
              : "cursor-pointer"
          }
        `}
        style={
          !empty
            ? {
                background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))",
                boxShadow: "0 8px 25px rgba(16,185,129,0.3)",
              }
            : {}
        }
      >
        {/* Shimmer on hover */}
        {!empty && (
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.05), transparent)" }}
          />
        )}

        {empty ? (
          <div className="flex flex-col items-center gap-0.5">
            <ShoppingBag className="w-5 h-5 text-gray-600" />
            <span className="text-gray-600 text-xs">Add items to bill</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-white/80" />
              <span className="text-white font-bold text-[17px] font-grotesk">
                PRINT & COLLECT
              </span>
            </div>
            <span className="text-white/70 text-xs font-mono">
              {itemCount} item{itemCount > 1 ? "s" : ""} · {totalQty} qty · Rs.{total}
            </span>
          </div>
        )}
      </motion.button>
    </div>
  )
}
