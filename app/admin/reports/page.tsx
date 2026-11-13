"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, TrendingUp, DollarSign, Receipt, PieChart as PieIcon } from "lucide-react"
import Link from "next/link"

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("today")
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadPeriodData()
  }, [period])

  const loadPeriodData = async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const fromDate = new Date()

      if (period === "today") {
        fromDate.setHours(0, 0, 0, 0)
      } else if (period === "week") {
        fromDate.setDate(now.getDate() - 7)
      } else {
        fromDate.setDate(now.getDate() - 30)
      }

      const { data } = await supabase
        .from("sales")
        .select(`
          id, receipt_number, total_amount, payment_method,
          created_at, is_returned,
          sale_items(id, product_name, quantity, total_price)
        `)
        .gte("created_at", fromDate.toISOString())
        .order("created_at", { ascending: false })

      setSales(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const validSales = sales.filter((s) => !s.is_returned)
  const totalRevenue = validSales.reduce(
    (sum, s) => sum + parseFloat(s.total_amount || "0"),
    0
  )

  // Top products
  const productCounts: Record<string, { name: string; qty: number; total: number }> = {}
  for (const s of validSales) {
    for (const item of s.sale_items || []) {
      if (!productCounts[item.product_name]) {
        productCounts[item.product_name] = { name: item.product_name, qty: 0, total: 0 }
      }
      productCounts[item.product_name].qty += parseFloat(item.quantity || "0")
      productCounts[item.product_name].total += parseFloat(item.total_price || "0")
    }
  }

  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 7)

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
          <h2 className="text-xl font-bold font-grotesk text-white">Financial Reports</h2>
          <p className="text-xs text-gray-400">Revenue & best-selling medicines</p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: "today", label: "Today" },
          { id: "week", label: "Last 7 Days" },
          { id: "month", label: "Last 30 Days" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setPeriod(t.id as any)}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              period === t.id
                ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                : "bg-pos-card border border-pos-border text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-pos-card border border-pos-border space-y-1">
          <p className="text-xs text-gray-400">Total Sales</p>
          <p className="text-xl font-bold font-mono text-teal-400">
            Rs.{Math.round(totalRevenue).toLocaleString()}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-pos-card border border-pos-border space-y-1">
          <p className="text-xs text-gray-400">Bills Cleared</p>
          <p className="text-xl font-bold font-mono text-blue-400">
            {validSales.length}
          </p>
        </div>
      </div>

      {/* Top Products */}
      <div className="p-4 rounded-2xl bg-pos-card border border-pos-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
          Top Selling Medicines (by Volume)
        </h3>

        {isLoading ? (
          <p className="text-center py-6 text-xs text-gray-500">Calculating stats...</p>
        ) : topProducts.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-500">No sales in this period.</p>
        ) : (
          <div className="divide-y divide-pos-border/50">
            {topProducts.map((p, idx) => (
              <div key={p.name} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0 mr-2">
                  <span className="w-5 h-5 rounded-full bg-pos-panel border border-pos-border text-[10px] font-bold text-gray-400 flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-white truncate">{p.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-teal-400">
                    {p.qty} sold
                  </span>
                  <p className="text-[10px] text-gray-500 font-mono">
                    Rs.{Math.round(p.total).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
