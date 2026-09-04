"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { formatDateTime, formatMoney } from "@/lib/pos-helpers"
import { Plus } from "lucide-react"

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("purchases")
      .select("*, purchase_items(id)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPurchases(data || [])
        setIsLoading(false)
      })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Purchase History</h1>
          <p className="text-gray-500 text-sm">{purchases.length} purchases</p>
        </div>
        <Link
          href="/inventory/receive"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Purchase
        </Link>
      </div>

      <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-border">
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Purchase #</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Supplier</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Date</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Items</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs">Total</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Payment</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-600">Loading…</td></tr>
            ) : purchases.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-600">No purchases yet</td></tr>
            ) : (
              purchases.map((p) => (
                <tr key={p.id} className="border-b border-pos-border/50 hover:bg-pos-cardHover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-teal-400 text-sm">{p.purchase_number}</td>
                  <td className="px-4 py-3 text-white text-sm">{p.supplier_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{formatDateTime(p.created_at)}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-sm">{p.purchase_items?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-mono text-white text-sm">Rs.{p.total_amount}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-sm">{p.payment_method}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.payment_status === "PAID"
                        ? "bg-teal-500/10 text-teal-400"
                        : p.payment_status === "CREDIT"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-gray-500/10 text-gray-400"
                    }`}>
                      {p.payment_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
