"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { formatMoney, formatDateTime, getDateRange } from "@/lib/pos-helpers"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import { TrendingUp, ShoppingBag, Tag, DollarSign, CreditCard, Smartphone, Printer } from "lucide-react"
import { formatDate } from "@/lib/pos-helpers"

const DATE_PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
]

const PIE_COLORS = ["#10B981", "#F97316", "#22C55E", "#A855F7"]

export default function ReportsPage() {
  const [preset, setPreset] = useState<"today" | "yesterday" | "week" | "month">("today")
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { from, to } = getDateRange(preset)
      const { data } = await supabase
        .from("sales")
        .select("id, total_amount, discount, payment_method, created_at, sale_items(product_name, quantity, unit_price, total_price)")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })

      setSales(data || [])

      // Load stock info
      const { data: lowData } = await supabase
        .from("products")
        .select("id, stock, low_stock_at")
        .eq("is_active", true)

      const low = (lowData || []).filter((p: any) => p.stock > 0 && p.stock <= p.low_stock_at)
      const out = (lowData || []).filter((p: any) => p.stock <= 0)
      setLowStockCount(low.length)
      setOutOfStockCount(out.length)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [preset])

  useEffect(() => { loadData() }, [loadData])

  // Computed stats
  const totalRevenue = sales.reduce((s, sale) => s + parseFloat(sale.total_amount), 0)
  const totalBills = sales.length
  const avgBill = totalBills > 0 ? totalRevenue / totalBills : 0
  const totalDiscount = sales.reduce((s, sale) => s + parseFloat(sale.discount || 0), 0)
  const cashSales = sales.filter((s) => s.payment_method === "CASH").reduce((sum, s) => sum + parseFloat(s.total_amount), 0)
  const digitalSales = totalRevenue - cashSales

  // Payment method breakdown
  const paymentBreakdown = ["CASH", "JAZZCASH", "EASYPAISA", "IN_STORE"].map((method) => ({
    name: method,
    value: sales.filter((s) => s.payment_method === method).reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
  })).filter((p) => p.value > 0)

  // Top products
  const productMap: Record<string, { name: string; units: number; revenue: number }> = {}
  sales.forEach((sale) => {
    (sale.sale_items || []).forEach((item: any) => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, units: 0, revenue: 0 }
      }
      productMap[item.product_name].units += item.quantity
      productMap[item.product_name].revenue += parseFloat(item.total_price)
    })
  })
  const topProducts = Object.values(productMap)
    .sort((a, b) => b.units - a.units)
    .slice(0, 10)

  // Hourly sales
  const hourlyMap: Record<number, number> = {}
  sales.forEach((sale) => {
    const hour = new Date(sale.created_at).getHours()
    hourlyMap[hour] = (hourlyMap[hour] || 0) + parseFloat(sale.total_amount)
  })
  const hourlyData = Array.from({ length: 14 }, (_, i) => i + 8).map((h) => ({
    hour: `${h > 12 ? h - 12 : h}${h >= 12 ? "PM" : "AM"}`,
    amount: Math.round(hourlyMap[h] || 0),
  }))

  const STAT_CARDS = [
    { label: "Total Revenue", value: `Rs.${Math.round(totalRevenue).toLocaleString()}`, icon: TrendingUp, color: "teal" },
    { label: "Total Bills", value: totalBills, icon: ShoppingBag, color: "blue" },
    { label: "Avg Bill", value: `Rs.${Math.round(avgBill)}`, icon: DollarSign, color: "purple" },
    { label: "Discount Given", value: `Rs.${Math.round(totalDiscount)}`, icon: Tag, color: "amber" },
    { label: "Cash Sales", value: `Rs.${Math.round(cashSales).toLocaleString()}`, icon: DollarSign, color: "green" },
    { label: "Digital Sales", value: `Rs.${Math.round(digitalSales).toLocaleString()}`, icon: Smartphone, color: "orange" },
  ]

  const COLOR_MAP: Record<string, string> = {
    teal: "text-teal-400", blue: "text-blue-400", purple: "text-purple-400",
    amber: "text-amber-400", green: "text-green-400", orange: "text-orange-400",
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Reports</h1>
          <p className="text-gray-500 text-sm">Sales analytics and insights</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-pos-card border border-pos-border rounded-xl text-gray-400 text-sm hover:text-white transition-all"
        >
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </div>

      {/* Date Filter */}
      <div className="flex gap-2">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              preset === p.key
                ? "bg-teal-500/20 text-teal-400 border-teal-500/40"
                : "bg-pos-card text-gray-500 border-pos-border hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            {STAT_CARDS.map((card) => (
              <div key={card.label} className="bg-pos-card border border-pos-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className={`w-4 h-4 ${COLOR_MAP[card.color]}`} />
                  <span className="text-gray-500 text-xs">{card.label}</span>
                </div>
                <p className={`font-mono text-xl font-bold ${COLOR_MAP[card.color]}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Hourly Sales */}
            <div className="col-span-2 bg-pos-card border border-pos-border rounded-xl p-4">
              <h3 className="font-grotesk font-semibold text-white text-sm mb-4">Hourly Sales</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={hourlyData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6B7280" }} />
                  <Tooltip
                    contentStyle={{ background: "rgb(20 20 24)", border: "1px solid rgb(35 35 42)", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v: any) => [`Rs.${v}`, "Sales"]}
                  />
                  <Bar dataKey="amount" fill="rgb(16 185 129)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Breakdown */}
            <div className="bg-pos-card border border-pos-border rounded-xl p-4">
              <h3 className="font-grotesk font-semibold text-white text-sm mb-4">Payment Methods</h3>
              {paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: { name?: string; percent?: number }) => `${name || ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `Rs.${Math.round(v)}`} contentStyle={{ background: "rgb(20 20 24)", border: "1px solid rgb(35 35 42)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-gray-700 text-sm">No sales</div>
              )}
            </div>
          </div>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <div className="bg-pos-card border border-pos-border rounded-xl p-4">
              <h3 className="font-grotesk font-semibold text-white text-sm mb-4">Top 10 Products</h3>
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-gray-700 font-mono text-xs w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-white text-sm truncate flex-1">{p.name}</span>
                        <span className="text-gray-500 text-xs ml-2">{p.units} units · Rs.{Math.round(p.revenue)}</span>
                      </div>
                      <div className="h-1.5 bg-pos-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${(p.units / topProducts[0].units) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-400 text-sm">Low Stock Items</p>
              <p className="font-mono text-2xl font-bold text-amber-400 mt-1">{lowStockCount}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm">Out of Stock</p>
              <p className="font-mono text-2xl font-bold text-red-400 mt-1">{outOfStockCount}</p>
            </div>
          </div>

          {/* Sales Table */}
          {sales.length > 0 && (
            <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-pos-border">
                <h3 className="font-grotesk font-semibold text-white text-sm">Sales ({sales.length})</h3>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-pos-card">
                    <tr className="border-b border-pos-border">
                      <th className="text-left px-4 py-2 text-gray-500 text-xs">Receipt</th>
                      <th className="text-left px-4 py-2 text-gray-500 text-xs">Time</th>
                      <th className="text-right px-4 py-2 text-gray-500 text-xs">Total</th>
                      <th className="text-center px-4 py-2 text-gray-500 text-xs">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-pos-border/50 hover:bg-pos-cardHover/50 transition-colors">
                        <td className="px-4 py-2 font-mono text-teal-400 text-xs">{sale.receipt_number || "—"}</td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{formatDateTime(sale.created_at)}</td>
                        <td className="px-4 py-2 text-right font-mono text-white text-sm">Rs.{sale.total_amount}</td>
                        <td className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-500">{sale.payment_method}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
