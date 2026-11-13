"use client"

import { motion } from "framer-motion"
import { ArrowRight, ShoppingBag } from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"

interface Props {
  onCheckout: () => void
}

export default function MainCTAButton({ onCheckout }: Props) {
  const empty = usePOSCartStore((s) => s.items.length === 0)
  const total = usePOSCartStore((s) => s.getTotal())

  return (
    <div className="p-4 pt-3 shrink-0">
      <motion.button
        whileTap={!empty ? { scale: 0.985 } : {}}
        onClick={!empty ? onCheckout : undefined}
        disabled={empty}
        className={`group relative w-full h-16 rounded-2xl overflow-hidden flex items-center justify-between px-5 transition-all duration-200 ${
          empty
            ? "cursor-not-allowed bg-pos-card border border-pos-border"
            : "cursor-pointer ring-1 ring-white/10 shadow-[0_12px_32px_-8px_rgba(16,185,129,0.55)] hover:shadow-[0_16px_40px_-8px_rgba(16,185,129,0.7)]"
        }`}
        style={!empty ? { background: "linear-gradient(135deg, rgb(20 200 140), rgb(5 150 105) 55%, rgb(4 120 87))" } : undefined}
      >
        {/* Sheen */}
        {!empty && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/15 to-transparent" />
        )}

        {empty ? (
          <span className="flex items-center gap-2 mx-auto text-gray-500 text-sm">
            <ShoppingBag className="w-5 h-5" />
            Add items to start a sale
          </span>
        ) : (
          <>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-white font-grotesk font-bold text-lg">Charge</span>
              <span className="text-white/70 text-[11px] flex items-center gap-1.5">
                Press <span className="kbd bg-white/15! border-white/20! text-white!">F9</span>
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-white tabular">
                Rs {total.toLocaleString("en-PK")}
              </span>
              <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-5 h-5 text-white" />
              </span>
            </span>
          </>
        )}
      </motion.button>
    </div>
  )
}
