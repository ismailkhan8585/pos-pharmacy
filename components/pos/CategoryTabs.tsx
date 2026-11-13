"use client"

import { useMemo } from "react"
import { LayoutGrid } from "lucide-react"
import { usePOSProductsStore } from "@/stores/pos-products"

export default function CategoryTabs() {
  const categories = usePOSProductsStore((s) => s.categories)
  const products = usePOSProductsStore((s) => s.products)
  const activeCategoryId = usePOSProductsStore((s) => s.activeCategoryId)
  const setCategory = usePOSProductsStore((s) => s.setCategory)

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of products) if (p.categoryId) map[p.categoryId] = (map[p.categoryId] || 0) + 1
    return map
  }, [products])

  const chip = (active: boolean) =>
    `flex items-center gap-2 h-9 pl-3 pr-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-150 shrink-0 border ${
      active
        ? "bg-teal-500 text-white border-teal-400/60 shadow-lg shadow-teal-500/25"
        : "bg-pos-card text-gray-400 border-pos-border hover:text-white hover:border-pos-borderHi"
    }`

  const countBadge = (active: boolean, n: number) => (
    <span
      className={`min-w-5.5 h-5 px-1.5 rounded-md text-[10px] font-mono flex items-center justify-center ${
        active ? "bg-white/20 text-white" : "bg-white/5 text-gray-500"
      }`}
    >
      {n}
    </span>
  )

  return (
    <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto no-scrollbar shrink-0">
      <button onClick={() => setCategory(null)} className={chip(activeCategoryId === null)}>
        <LayoutGrid className="w-4 h-4" />
        <span>All</span>
        {countBadge(activeCategoryId === null, products.length)}
      </button>

      {categories.map((cat) => {
        const active = activeCategoryId === cat.id
        return (
          <button key={cat.id} onClick={() => setCategory(active ? null : cat.id)} className={chip(active)}>
            {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
            <span>{cat.nameEn}</span>
            {countBadge(active, counts[cat.id] || 0)}
          </button>
        )
      })}
    </div>
  )
}
