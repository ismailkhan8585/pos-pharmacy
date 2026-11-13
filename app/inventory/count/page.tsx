"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Save, CheckSquare } from "lucide-react"
import toast from "react-hot-toast"
import { PageHeader } from "@/components/ui"
import { ClipboardList as HeaderIcon } from "lucide-react"

export default function StockCountPage() {
  const [products, setProducts] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    supabase.from("products").select("id, name_en, stock, unit, category_id, categories(name_en)").eq("is_active", true).order("name_en").then(({ data }) => {
      setProducts(data || [])
      setIsLoading(false)
    })
  }, [])

  const handleCountChange = (id: string, value: string) => {
    setCounts((prev) => ({ ...prev, [id]: value }))
  }

  const filtered = products.filter((p) => !search || p.name_en.toLowerCase().includes(search.toLowerCase()))

  const changedItems = products.filter(
    (p) => counts[p.id] !== undefined && counts[p.id] !== "" && parseInt(counts[p.id]) !== p.stock
  )

  const handleApplyAll = async () => {
    if (changedItems.length === 0) {
      toast.error("No changes to apply")
      return
    }

    setIsSaving(true)
    try {
      for (const product of changedItems) {
        const newStock = parseInt(counts[product.id])
        const diff = newStock - product.stock

        await supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", product.id)
        await supabase.from("stock_ledger").insert({
          product_id: product.id,
          product_name: product.name_en,
          action_type: "STOCK_COUNT",
          quantity: diff,
          balance_after: newStock,
          reference_type: "STOCK_COUNT",
          notes: "Physical stock count adjustment",
        })
      }

      toast.success(`${changedItems.length} products adjusted`)
      setCounts({})

      // Refresh
      supabase.from("products").select("id, name_en, stock, unit, category_id, categories(name_en)").eq("is_active", true).order("name_en").then(({ data }) => setProducts(data || []))
    } catch (err: any) {
      toast.error(err?.message || "Failed to apply")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader icon={HeaderIcon} title="Physical Stock Count" subtitle="Enter actual counts to sync system stock" />
        {changedItems.length > 0 && (
          <button
            onClick={handleApplyAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <CheckSquare className="w-4 h-4" />
            {isSaving ? "Applying…" : `Apply ${changedItems.length} Changes`}
          </button>
        )}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="w-full max-w-sm h-10 px-4 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
      />

      <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-border">
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Product</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">System Stock</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Physical Count</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Difference</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-600">Loading…</td></tr>
            ) : (
              filtered.map((p) => {
                const countVal = counts[p.id]
                const physCount = countVal !== undefined && countVal !== "" ? parseInt(countVal) : null
                const diff = physCount !== null ? physCount - p.stock : null
                const hasChange = diff !== null && diff !== 0

                return (
                  <tr key={p.id} className={`border-b border-pos-border/50 transition-colors ${hasChange ? "bg-amber-500/5" : "hover:bg-pos-cardHover/50"}`}>
                    <td className="px-4 py-2.5">
                      <p className="text-white text-sm">{p.name_en}</p>
                      <p className="text-gray-600 text-xs">{p.categories?.name_en || "—"}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="font-mono text-white">{p.stock}</span>
                      <span className="text-gray-600 text-xs ml-1">{p.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="number"
                        value={counts[p.id] ?? ""}
                        onChange={(e) => handleCountChange(p.id, e.target.value)}
                        placeholder={String(p.stock)}
                        min={0}
                        className="w-20 h-8 px-2 bg-pos-bg border border-pos-border rounded-lg text-sm font-mono text-white text-center outline-none focus:border-teal-500/50"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {diff !== null ? (
                        <span className={`font-mono text-sm font-bold ${diff > 0 ? "text-teal-400" : diff < 0 ? "text-red-400" : "text-gray-600"}`}>
                          {diff > 0 ? "+" : ""}{diff}
                        </span>
                      ) : <span className="text-gray-700">—</span>}
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
