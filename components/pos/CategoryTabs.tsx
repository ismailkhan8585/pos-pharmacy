"use client"

import { usePOSProductsStore } from "@/stores/pos-products"

export default function CategoryTabs() {
  const { categories, activeCategoryId, setCategory } = usePOSProductsStore()

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-pos-border flex-shrink-0">
      {/* All tab */}
      <button
        onClick={() => setCategory(null)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
          activeCategoryId === null
            ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
            : "text-gray-500 hover:text-gray-300 border border-transparent hover:bg-pos-card"
        }`}
      >
        🏥 All
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => setCategory(cat.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex-shrink-0 ${
            activeCategoryId === cat.id
              ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
              : "text-gray-500 hover:text-gray-300 border border-transparent hover:bg-pos-card"
          }`}
        >
          {cat.icon && <span>{cat.icon}</span>}
          <span>{cat.nameEn}</span>
        </button>
      ))}
    </div>
  )
}
