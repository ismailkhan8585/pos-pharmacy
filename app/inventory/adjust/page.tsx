"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Save, Search } from "lucide-react"
import toast from "react-hot-toast"

export default function AdjustStockPage() {
  const [products, setProducts] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<any>(null)
  const [physicalCount, setPhysicalCount] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const REASONS = ["Counting Error", "Damage", "Theft", "Expiry Write-off", "Found Stock", "Other"]

  useEffect(() => {
    supabase.from("products").select("id, name_en, stock, unit, low_stock_at").order("name_en").then(({ data }) => setProducts(data || []))
  }, [])

  const filtered = products.filter((p) => !search || p.name_en.toLowerCase().includes(search.toLowerCase())).slice(0, 10)

  const diff = selected && physicalCount !== "" ? parseInt(physicalCount) - selected.stock : null

  const handleAdjust = async () => {
    if (!selected || physicalCount === "" || !reason) {
      toast.error("Select a product, enter count, and choose reason")
      return
    }
    const newStock = parseInt(physicalCount)
    const difference = newStock - selected.stock

    setIsSaving(true)
    try {
      await supabase.from("products").update({ stock: newStock, updated_at: new Date().toISOString() }).eq("id", selected.id)
      await supabase.from("stock_ledger").insert({
        product_id: selected.id,
        product_name: selected.name_en,
        action_type: "ADJUSTMENT",
        quantity: difference,
        balance_after: newStock,
        reference_type: "MANUAL_ADJUST",
        notes: `${reason}${notes ? " - " + notes : ""}`,
      })

      toast.success(`Stock adjusted: ${selected.name_en} → ${newStock} ${selected.unit}`)
      setSelected(null)
      setPhysicalCount("")
      setReason("")
      setNotes("")
      // Refresh products
      supabase.from("products").select("id, name_en, stock, unit, low_stock_at").order("name_en").then(({ data }) => setProducts(data || []))
    } catch (err: any) {
      toast.error(err?.message || "Adjustment failed")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="font-grotesk font-bold text-2xl text-white">Adjust Stock</h1>
        <p className="text-gray-500 text-sm">Correct stock count with reason</p>
      </div>

      {/* Product Search */}
      <div className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-3">
        <h2 className="font-grotesk font-semibold text-white text-sm">Select Product</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null) }}
            placeholder="Search product…"
            className="w-full h-10 pl-9 pr-4 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
          />
        </div>
        {search && !selected && (
          <div className="border border-pos-border rounded-xl overflow-hidden">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setSearch(p.name_en); setPhysicalCount(String(p.stock)) }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-pos-cardHover border-b border-pos-border/50 last:border-0 transition-colors"
              >
                <span className="text-white">{p.name_en}</span>
                <span className="font-mono text-gray-500">{p.stock} {p.unit}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Adjustment Form */}
      {selected && (
        <div className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{selected.name_en}</p>
              <p className="text-gray-500 text-sm">System stock: <span className="font-mono text-white">{selected.stock} {selected.unit}</span></p>
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Physical Count (actual stock)</label>
            <input
              type="number"
              value={physicalCount}
              onChange={(e) => setPhysicalCount(e.target.value)}
              min={0}
              className="w-full h-12 px-4 bg-pos-bg border border-pos-border rounded-xl text-2xl font-mono text-white outline-none focus:border-teal-500/50"
            />
          </div>

          {diff !== null && (
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
              diff > 0 ? "bg-teal-500/10 border border-teal-500/20" :
              diff < 0 ? "bg-red-500/10 border border-red-500/20" :
              "bg-pos-bg border border-pos-border"
            }`}>
              <span className="text-gray-400 text-sm">Difference:</span>
              <span className={`font-mono font-bold text-lg ${diff > 0 ? "text-teal-400" : diff < 0 ? "text-red-400" : "text-gray-500"}`}>
                {diff > 0 ? "+" : ""}{diff} {selected.unit}
              </span>
            </div>
          )}

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block">Reason *</label>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                    reason === r ? "bg-amber-500/20 text-amber-400 border-amber-500/40" : "bg-pos-bg text-gray-500 border-pos-border hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes…"
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
            />
          </div>

          <button
            onClick={handleAdjust}
            disabled={isSaving || !reason || physicalCount === ""}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl font-medium hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving…" : "Apply Adjustment"}
          </button>
        </div>
      )}
    </div>
  )
}
