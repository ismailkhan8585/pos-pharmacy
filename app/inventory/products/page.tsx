"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Edit, Trash2, Package, Filter, TrendingDown, AlertCircle } from "lucide-react"
import { formatMoney, getStockStatus } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name_en, icon)")
        .order("name_en")

      if (error) throw error
      setProducts(data || [])
    } catch {
      toast.error("Failed to load products")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
    supabase.from("categories").select("id, name_en, icon").then(({ data }) => {
      setCategories(data || [])
    })
  }, [loadProducts])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await supabase.from("products").update({ is_active: false }).eq("id", id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success("Product deactivated")
    } catch {
      toast.error("Failed to delete")
    }
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name_en.toLowerCase().includes(q) || (p.barcode || "").includes(q) || (p.brand || "").toLowerCase().includes(q)
    const matchCat = !categoryFilter || p.category_id === categoryFilter
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? p.is_active
        : statusFilter === "low"
        ? p.stock > 0 && p.stock <= p.low_stock_at
        : statusFilter === "out"
        ? p.stock <= 0
        : !p.is_active
    return matchSearch && matchCat && matchStatus
  })

  const stockStats = {
    total: products.length,
    active: products.filter((p) => p.is_active).length,
    low: products.filter((p) => p.stock > 0 && p.stock <= p.low_stock_at).length,
    out: products.filter((p) => p.stock <= 0).length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{stockStats.total} products · {stockStats.active} active</p>
        </div>
        <Link
          href="/inventory/products/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stockStats.total, color: "text-white", bg: "bg-pos-card" },
          { label: "Active", value: stockStats.active, color: "text-teal-400", bg: "bg-teal-500/10" },
          { label: "Low Stock", value: stockStats.low, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Out of Stock", value: stockStats.out, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border border-pos-border rounded-xl p-4`}>
            <p className={`font-mono text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-gray-500 text-sm mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full h-10 pl-9 pr-4 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-10 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name_en}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-border">
              <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Product</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Category</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs font-medium">Barcode</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs font-medium">Stock</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs font-medium">Sell Price</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs font-medium">Cost Price</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-600">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-8 h-8 text-gray-700" />
                    <p className="text-gray-600 text-sm">No products found</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((product) => {
                const status = getStockStatus(product.stock, product.low_stock_at)
                return (
                  <tr key={product.id} className="border-b border-pos-border/50 hover:bg-pos-cardHover/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-white text-sm font-medium">{product.name_en}</p>
                        {product.brand && <p className="text-gray-600 text-xs">{product.brand}</p>}
                        {!product.is_active && (
                          <span className="text-[10px] bg-gray-500/10 text-gray-500 border border-gray-500/20 rounded px-1">Inactive</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {product.categories ? `${product.categories.icon || ""} ${product.categories.name_en}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">{product.barcode || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-sm font-bold ${
                        status === "ok" ? "text-teal-400" : status === "low" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {product.stock}
                      </span>
                      <span className="text-gray-600 text-xs ml-1">{product.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white text-sm">Rs.{product.sell_price}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500 text-sm">Rs.{product.cost_price || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/inventory/products/${product.id}/edit`}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.name_en)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
