"use client"

import { useState } from "react"
import { usePOSProductsStore } from "@/stores/pos-products"
import ProductTile from "./ProductTile"
import { ChevronLeft, ChevronRight, Package } from "lucide-react"

const PAGE_SIZE = 24

interface Props {
  onProductsLoaded?: () => void
}

export default function ProductGrid({ onProductsLoaded }: Props) {
  const { getFilteredProducts, isLoading, isReady } = usePOSProductsStore()
  const [page, setPage] = useState(0)
  const allProducts = getFilteredProducts()
  const totalPages = Math.ceil(allProducts.length / PAGE_SIZE)
  const pageProducts = allProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Reset to page 0 when filter changes
  const handleSetPage = (p: number) => {
    setPage(Math.max(0, Math.min(p, totalPages - 1)))
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 text-sm">Loading products…</p>
        </div>
      </div>
    )
  }

  if (isReady && allProducts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-pos-card border border-pos-border flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-700" />
          </div>
          <p className="text-gray-500 text-sm font-medium">No products found</p>
          <p className="text-gray-700 text-xs">Try searching with a different term or clear filters</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(116px,1fr))] gap-2">
          {pageProducts.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-pos-border flex-shrink-0">
          <button
            onClick={() => handleSetPage(page - 1)}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-pos-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Prev
          </button>

          <span className="text-xs text-gray-600 font-mono">
            {page + 1} / {totalPages}
            <span className="text-gray-700 ml-2">({allProducts.length} items)</span>
          </span>

          <button
            onClick={() => handleSetPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-pos-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
