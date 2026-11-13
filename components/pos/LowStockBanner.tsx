"use client"

import { useMemo } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight } from "lucide-react"
import { usePOSProductsStore } from "@/stores/pos-products"

export default function LowStockBanner() {
  const products = usePOSProductsStore((s) => s.products)

  const { low, out } = useMemo(() => {
    let low = 0
    let out = 0
    for (const p of products) {
      if (p.stock <= 0) out++
      else if (p.stock <= p.lowStockAt) low++
    }
    return { low, out }
  }, [products])

  if (low === 0 && out === 0) return null

  return (
    <div className="px-4 pb-3 shrink-0">
      <Link
        href="/inventory/products?filter=low"
        className="group flex items-center gap-3 h-9 px-3 rounded-xl border border-amber-500/20 bg-linear-to-r from-amber-500/10 to-transparent hover:border-amber-500/40 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-xs text-gray-300 flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium text-amber-300">Stock attention</span>
          {low > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {low} running low
            </span>
          )}
          {out > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {out} out of stock
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-amber-300/80 group-hover:text-amber-200 shrink-0">
          Review <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </Link>
    </div>
  )
}
