"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatDate, getDaysUntilExpiry } from "@/lib/pos-helpers"
import { AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"

export default function ExpiryPage() {
  const [batches, setBatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"expired" | "soon" | "all">("soon")

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const { data } = await supabase
        .from("product_batches")
        .select("*, products(id, name_en, unit)")
        .not("expiry_date", "is", null)
        .order("expiry_date")
      setBatches(data || [])
      setIsLoading(false)
    }
    load()
  }, [])

  const expired = batches.filter((b) => getDaysUntilExpiry(b.expiry_date) < 0)
  const soon = batches.filter((b) => {
    const d = getDaysUntilExpiry(b.expiry_date)
    return d >= 0 && d <= 30
  })
  const all = batches

  const displayed = activeTab === "expired" ? expired : activeTab === "soon" ? soon : all

  const handleWriteOff = async (batch: any) => {
    if (!confirm(`Write off ${batch.quantity} units of ${batch.products?.name_en}?`)) return
    try {
      await supabase
        .from("products")
        .update({ stock: `stock - ${batch.quantity}` })
        .eq("id", batch.product_id)
      await supabase.from("stock_ledger").insert({
        product_id: batch.product_id,
        product_name: batch.products?.name_en,
        action_type: "WRITE_OFF",
        quantity: -batch.quantity,
        balance_after: 0,
        reference_type: "EXPIRY",
      })
      await supabase.from("product_batches").delete().eq("id", batch.id)
      setBatches((prev) => prev.filter((b) => b.id !== batch.id))
      toast.success("Written off successfully")
    } catch {
      toast.error("Failed to write off")
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-grotesk font-bold text-2xl text-white">Expiry Management</h1>
        <p className="text-gray-500 text-sm">Track and manage product expiry dates</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "expired", label: "Expired", count: expired.length, color: "red" },
          { key: "soon", label: "Expiring Soon (≤30 days)", count: soon.length, color: "amber" },
          { key: "all", label: "All Batches", count: all.length, color: "teal" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              activeTab === tab.key
                ? `bg-${tab.color}-500/20 text-${tab.color}-400 border-${tab.color}-500/40`
                : "bg-pos-card text-gray-500 border-pos-border hover:text-white"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? `bg-${tab.color}-500/30` : "bg-pos-border"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-border">
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Product</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Batch</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Expiry Date</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Days</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs">Qty</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-600">Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-600">No items</td></tr>
            ) : (
              displayed.map((b) => {
                const days = getDaysUntilExpiry(b.expiry_date)
                return (
                  <tr key={b.id} className="border-b border-pos-border/50 hover:bg-pos-cardHover/50 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">{b.products?.name_en}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{b.batch_number || "—"}</td>
                    <td className="px-4 py-3 text-center text-sm">{formatDate(b.expiry_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono text-sm font-bold ${days < 0 ? "text-red-400" : days <= 30 ? "text-amber-400" : "text-teal-400"}`}>
                        {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white text-sm">{b.quantity}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleWriteOff(b)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs hover:bg-red-500/20 transition-all"
                      >
                        Write Off
                      </button>
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
