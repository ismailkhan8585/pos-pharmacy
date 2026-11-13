"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react"
import { usePOSProductsStore } from "@/stores/pos-products"
import ProductTile from "./ProductTile"

const PAGE_SIZE = 30

export default function ProductGrid() {
  const products = usePOSProductsStore((s) => s.products)
  const searchQuery = usePOSProductsStore((s) => s.searchQuery)
  const activeCategoryId = usePOSProductsStore((s) => s.activeCategoryId)
  const isLoading = usePOSProductsStore((s) => s.isLoading)
  const getFilteredProducts = usePOSProductsStore((s) => s.getFilteredProducts)
  const setSearch = usePOSProductsStore((s) => s.setSearch)
  const setCategory = usePOSProductsStore((s) => s.setCategory)

  const allProducts = useMemo(() => getFilteredProducts(), [products, searchQuery, activeCategoryId])

  // Page is tied to the current filter — changing search/category jumps back to page 1
  const filterKey = `${searchQuery}|${activeCategoryId ?? ""}`
  const [pageState, setPageState] = useState({ key: filterKey, page: 0 })
  const totalPages = Math.max(1, Math.ceil(allProducts.length / PAGE_SIZE))
  const page = pageState.key === filterKey ? Math.min(pageState.page, totalPages - 1) : 0
  const setPage = (p: number) => setPageState({ key: filterKey, page: Math.max(0, Math.min(p, totalPages - 1)) })

  const pageProducts = allProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const from = allProducts.length === 0 ? 0 : page * PAGE_SIZE + 1
  const to = Math.min(allProducts.length, (page + 1) * PAGE_SIZE)

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden px-4 pb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-37 rounded-2xl bg-pos-card border border-pos-border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (allProducts.length === 0) {
    const hasFilter = !!searchQuery || !!activeCategoryId
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center px-8">
          <div className="w-16 h-16 rounded-2xl surface flex items-center justify-center">
            <PackageSearch className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-200 text-sm font-semibold">No products found</p>
          <p className="text-gray-500 text-xs max-w-xs">
            {searchQuery ? <>Nothing matches “{searchQuery}”. Check the spelling or try the brand name.</> : "This category has no products yet."}
          </p>
          {hasFilter && (
            <button
              onClick={() => {
                setSearch("")
                setCategory(null)
              }}
              className="mt-1 h-9 px-4 rounded-xl border border-pos-border bg-pos-card text-xs text-gray-300 hover:text-white hover:border-pos-borderHi transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {pageProducts.map((product) => (
            <ProductTile key={product.id} product={product} />
          ))}
        </div>
      </div>

      {/* Footer: count + pagination */}
      <div className="flex items-center justify-between gap-3 px-4 h-12 border-t border-pos-border bg-pos-bg/60 shrink-0">
        <span className="text-xs text-gray-500">
          Showing <span className="text-gray-300 font-mono">{from}–{to}</span> of{" "}
          <span className="text-gray-300 font-mono">{allProducts.length}</span> products
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-pos-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 font-mono px-2 tabular">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-pos-card disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
