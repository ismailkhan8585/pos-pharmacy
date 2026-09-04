"use client"

import { usePOSProductsStore } from "@/stores/pos-products"
import { AlertTriangle, Package } from "lucide-react"
import Link from "next/link"

export default function LowStockBanner() {
  const { getLowStockProducts, getOutOfStockProducts } = usePOSProductsStore()

  const lowItems = getLowStockProducts()
  const outItems = getOutOfStockProducts()

  if (lowItems.length === 0 && outItems.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {lowItems.length > 0 && (
          <span className="text-amber-400 text-xs">
            {lowItems.length} low stock
          </span>
        )}
        {outItems.length > 0 && (
          <span className="text-red-400 text-xs">
            {outItems.length} out of stock
          </span>
        )}
      </div>
      <Link
        href="/inventory/products?filter=low"
        className="text-amber-400 text-[10px] hover:text-amber-300 transition-colors flex-shrink-0"
      >
        View →
      </Link>
    </div>
  )
}
