"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Plus, Search, Pencil, Archive, ArchiveRestore, Package, Boxes, CircleCheck, TriangleAlert, PackageX, RefreshCw } from "lucide-react"
import { getStockStatus, calculateMargin } from "@/lib/pos-helpers"
import { PageHeader, EmptyState, btnPrimary, btnSecondary } from "@/components/ui"
import toast from "react-hot-toast"

type StatusFilter = "all" | "active" | "low" | "out" | "inactive"

const fmt = (n: number) => Number(n || 0).toLocaleString("en-PK")

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Honour ?filter=low|out|inactive (e.g. from the POS stock alert)
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get("filter") as StatusFilter | null
    if (f && ["active", "low", "out", "inactive"].includes(f)) setStatusFilter(f)
  }, [])

  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("products").select("*, categories(name_en, icon)").order("name_en")
      if (error) throw error
      setProducts(data || [])
    } catch {
      toast.error("Failed to load products — check your connection")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
    supabase
      .from("categories")
      .select("id, name_en, icon")
      .then(({ data }) => setCategories(data || []))
  }, [loadProducts])

  const toggleActive = async (product: any) => {
    const next = !product.is_active
    if (!next && !confirm(`Archive "${product.name_en}"? It will be hidden from the POS.`)) return
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", product.id)
    if (error) {
      toast.error("Could not update product")
      return
    }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_active: next } : p)))
    toast.success(next ? "Product restored" : "Product archived")
  }

  const stats = useMemo(
    () => ({
      all: products.length,
      active: products.filter((p) => p.is_active).length,
      low: products.filter((p) => p.is_active && p.stock > 0 && p.stock <= p.low_stock_at).length,
      out: products.filter((p) => p.is_active && p.stock <= 0).length,
      inactive: products.filter((p) => !p.is_active).length,
    }),
    [products]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name_en.toLowerCase().includes(q) ||
        (p.barcode || "").includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
      const matchCat = !categoryFilter || p.category_id === categoryFilter
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? p.is_active
          : statusFilter === "low"
          ? p.is_active && p.stock > 0 && p.stock <= p.low_stock_at
          : statusFilter === "out"
          ? p.is_active && p.stock <= 0
          : !p.is_active
      return matchSearch && matchCat && matchStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  const STAT_TILES: { key: StatusFilter; label: string; icon: any; tone: string; ring: string }[] = [
    { key: "all", label: "All products", icon: Boxes, tone: "text-white", ring: "ring-white/20" },
    { key: "active", label: "Active", icon: CircleCheck, tone: "text-teal-300", ring: "ring-teal-500/50" },
    { key: "low", label: "Low stock", icon: TriangleAlert, tone: "text-amber-300", ring: "ring-amber-500/50" },
    { key: "out", label: "Out of stock", icon: PackageX, tone: "text-red-300", ring: "ring-red-500/50" },
  ]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        icon={Package}
        title="Products"
        subtitle={`${fmt(stats.all)} products in catalog · ${fmt(stats.active)} active`}
        actions={
          <>
            <button onClick={loadProducts} className={btnSecondary} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <Link href="/inventory/products/new" className={btnPrimary}>
              <Plus className="w-4 h-4" />
              Add product
            </Link>
          </>
        }
      />

      {/* Stat tiles double as filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STAT_TILES.map(({ key, label, icon: Icon, tone, ring }) => {
          const active = statusFilter === key
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(active && key !== "all" ? "all" : key)}
              className={`text-left rounded-2xl surface p-4 transition-all hover:-translate-y-0.5 ${active ? `ring-2 ${ring}` : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">{label}</p>
                <Icon className={`w-4 h-4 ${tone}`} />
              </div>
              <p className={`font-mono text-2xl font-bold mt-2 tabular ${tone}`}>{fmt(stats[key])}</p>
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-60 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, brand, barcode or SKU…"
            className="w-full h-11 pl-10 pr-4 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name_en}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-11 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white outline-none"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
          <option value="inactive">Archived ({stats.inactive})</option>
        </select>
        <span className="ml-auto text-xs text-gray-500">
          {fmt(filtered.length)} result{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div className="bg-pos-card border border-pos-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Barcode</th>
                <th className="text-right px-4 py-3">Stock</th>
                <th className="text-right px-4 py-3">Price</th>
                <th className="text-right px-4 py-3">Cost</th>
                <th className="text-right px-4 py-3">Margin</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-pos-border/60">
                    <td colSpan={8} className="px-5 py-3">
                      <div className="h-8 rounded-lg bg-white/3 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={Package}
                      title="No products match"
                      description="Try a different search or clear the filters."
                      action={
                        (search || categoryFilter || statusFilter !== "all") && (
                          <button
                            onClick={() => {
                              setSearch("")
                              setCategoryFilter("")
                              setStatusFilter("all")
                            }}
                            className={`${btnSecondary} h-9 text-xs`}
                          >
                            Clear filters
                          </button>
                        )
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((product) => {
                  const status = getStockStatus(product.stock, product.low_stock_at)
                  const margin = calculateMargin(product.sell_price, product.cost_price || 0)
                  return (
                    <tr key={product.id} className={`border-t border-pos-border/60 group ${!product.is_active ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/15 flex items-center justify-center text-sm shrink-0">
                            {product.categories?.icon || <Package className="w-4 h-4 text-teal-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium flex items-center gap-1.5">
                              <span className="truncate">{product.name_en}</span>
                              {product.requires_prescription && (
                                <span className="text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded px-1">Rx</span>
                              )}
                              {!product.is_active && (
                                <span className="text-[9px] font-semibold bg-white/5 text-gray-400 border border-white/10 rounded px-1">ARCHIVED</span>
                              )}
                            </p>
                            {product.brand && <p className="text-gray-500 text-xs truncate">{product.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm whitespace-nowrap">{product.categories?.name_en || "—"}</td>
                      <td className="px-4 py-3 font-mono text-gray-500 text-xs">{product.barcode || "—"}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-1 rounded-lg border ${
                            status === "ok"
                              ? "text-teal-300 bg-teal-500/10 border-teal-500/20"
                              : status === "low"
                              ? "text-amber-300 bg-amber-500/10 border-amber-500/25"
                              : "text-red-300 bg-red-500/10 border-red-500/25"
                          }`}
                        >
                          {fmt(product.stock)}
                          <span className="font-sans font-normal opacity-70">{product.unit}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white text-sm tabular">Rs {fmt(product.sell_price)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 text-sm tabular">Rs {fmt(product.cost_price || 0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs tabular">
                        <span className={margin >= 15 ? "text-emerald-400" : margin > 0 ? "text-amber-300" : "text-red-400"}>
                          {product.cost_price ? `${margin.toFixed(0)}%` : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/inventory/products/${product.id}/edit`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-teal-300 hover:bg-teal-500/10 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => toggleActive(product)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 transition-all ${
                              product.is_active ? "hover:text-red-400 hover:bg-red-500/10" : "hover:text-teal-300 hover:bg-teal-500/10"
                            }`}
                            title={product.is_active ? "Archive" : "Restore"}
                          >
                            {product.is_active ? <Archive className="w-4 h-4" /> : <ArchiveRestore className="w-4 h-4" />}
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
    </div>
  )
}
