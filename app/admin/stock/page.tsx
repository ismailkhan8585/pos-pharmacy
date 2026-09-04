"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Search, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

export default function AdminStockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "low" | "out">("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name_en, name_ur, brand, barcode, stock, low_stock_at, sell_price, cost_price, unit")
      .eq("is_active", true)
      .order("stock", { ascending: true })
      .then(({ data }) => {
        setProducts(data || [])
        setIsLoading(false)
      })
  }, [])

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name_en.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.barcode && p.barcode.includes(search))

    if (!matchesSearch) return false

    if (filter === "low") {
      return p.stock > 0 && p.stock <= (p.low_stock_at || 10)
    }
    if (filter === "out") {
      return p.stock <= 0
    }
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl bg-pos-card border border-pos-border text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold font-grotesk text-white">Stock Status</h2>
          <p className="text-xs text-gray-400">Inventory levels & restocking alerts</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: "all", label: "All Items" },
          { id: "low", label: "Low Stock" },
          { id: "out", label: "Out of Stock" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === tab.id
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                : "bg-pos-card border border-pos-border text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicine name, brand, or barcode..."
          className="w-full h-10 pl-10 pr-4 bg-pos-card border border-pos-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
        />
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-xs text-gray-500">Loading catalog...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-xs text-gray-500">No items match criteria.</p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((product) => {
            const isOut = product.stock <= 0
            const isLow = product.stock > 0 && product.stock <= (product.low_stock_at || 10)

            return (
              <div
                key={product.id}
                className="p-3.5 bg-pos-card border border-pos-border rounded-2xl flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-xs text-white">
                    {product.name_en}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {product.brand || "Generics"}
                    {product.barcode ? ` · ${product.barcode}` : ""}
                  </p>
                  <p className="text-xs text-teal-400 font-mono font-bold mt-1">
                    Rs.{product.sell_price}{" "}
                    <span className="text-[10px] text-gray-500 font-normal">
                      (Cost: Rs.{product.cost_price || 0})
                    </span>
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                      isOut
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : isLow
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {product.stock} {product.unit || "pcs"}
                  </span>
                  <p className="text-[10px] text-gray-500">
                    Alert at: {product.low_stock_at || 10}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
