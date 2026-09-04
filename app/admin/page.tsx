"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  DollarSign,
  Receipt,
  Wallet,
  Smartphone,
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { getLocalDB_Stats } from "@/lib/pos-db-local"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

const PIE_COLORS = ["#10B981", "#F59E0B", "#3B82F6", "#8B5CF6"]

export default function AdminDashboardPage() {
  const [sales, setSales] = useState<any[]>([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [pendingOffline, setPendingOffline] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()

      // 1. Fetch Today's Sales
      const { data: salesData } = await supabase
        .from("sales")
        .select(`
          id, receipt_number, total_amount, payment_method,
          created_at, is_returned
        `)
        .gte("created_at", todayIso)
        .order("created_at", { ascending: false })

      setSales(salesData || [])

      // 2. Low stock products count
      const { data: productsData } = await supabase
        .from("products")
        .select("id, stock, low_stock_at")
        .eq("is_active", true)

      if (productsData) {
        const low = productsData.filter((p: any) => p.stock <= (p.low_stock_at || 10))
        setLowStockCount(low.length)
      }

      // 3. Expiring batches count (next 30 days)
      const nextMonth = new Date()
      nextMonth.setDate(nextMonth.getDate() + 30)
      const { data: batchesData } = await supabase
        .from("product_batches")
        .select("id, expiry_date")
        .lte("expiry_date", nextMonth.toISOString().slice(0, 10))

      setExpiringCount(batchesData?.length || 0)

      // 4. Pending offline sales
      try {
        const stats = await getLocalDB_Stats()
        setPendingOffline(stats.pending)
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculated metrics
  const totalRevenue = sales
    .filter((s) => !s.is_returned)
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0)

  const cashSales = sales
    .filter((s) => !s.is_returned && s.payment_method === "CASH")
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0)

  const digitalSales = sales
    .filter(
      (s) =>
        !s.is_returned &&
        (s.payment_method === "JAZZCASH" || s.payment_method === "EASYPAISA")
    )
    .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0)

  // Chart: Hourly Breakdown
  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 9 // 9 AM to 8 PM
    const count = sales.filter((s) => {
      const h = new Date(s.created_at).getHours()
      return h === hour
    }).length
    const total = sales
      .filter((s) => new Date(s.created_at).getHours() === hour)
      .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0)

    const label = `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "pm" : "am"}`
    return { time: label, sales: total, count }
  })

  // Payment Breakdown
  const paymentBreakdown = [
    { name: "Cash", value: cashSales },
    {
      name: "JazzCash",
      value: sales
        .filter((s) => s.payment_method === "JAZZCASH")
        .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0),
    },
    {
      name: "EasyPaisa",
      value: sales
        .filter((s) => s.payment_method === "EASYPAISA")
        .reduce((sum, s) => sum + parseFloat(s.total_amount || "0"), 0),
    },
  ].filter((p) => p.value > 0)

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h2 className="text-xl font-bold font-grotesk text-white">
            Daily Dashboard
          </h2>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString("en-PK", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={isLoading}
          className="p-2 rounded-xl bg-pos-card border border-pos-border text-gray-400 hover:text-teal-400 transition-all active:scale-95"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Offline Status Alert if any */}
      {pendingOffline > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-300">
              {pendingOffline} offline sale(s) on counter waiting to sync
            </span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">
            Auto-Sync Ready
          </span>
        </div>
      )}

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-xl font-bold font-mono text-teal-400">
            Rs.{Math.round(totalRevenue).toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500">Gross sales before discount</p>
        </div>

        <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Bills Count</span>
            <Receipt className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-400">
            {sales.length}
          </p>
          <p className="text-[10px] text-gray-500">
            Avg: Rs.{sales.length ? Math.round(totalRevenue / sales.length) : 0}
          </p>
        </div>

        <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Cash Received</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            Rs.{Math.round(cashSales).toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500">Physical drawer cash</p>
        </div>

        <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Digital / Mobile</span>
            <Smartphone className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-xl font-bold font-mono text-orange-400">
            Rs.{Math.round(digitalSales).toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-500">JazzCash & EasyPaisa</p>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/admin/stock"
          className="p-3.5 rounded-2xl bg-pos-card border border-pos-border hover:border-red-500/30 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Low Stock Warning</p>
              <p className="text-[11px] text-gray-400">
                {lowStockCount > 0
                  ? `${lowStockCount} items need restocking`
                  : "All stocks healthy"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </Link>

        <Link
          href="/admin/stock"
          className="p-3.5 rounded-2xl bg-pos-card border border-pos-border hover:border-amber-500/30 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Expiry Warning</p>
              <p className="text-[11px] text-gray-400">
                {expiringCount > 0
                  ? `${expiringCount} batch(es) expiring soon`
                  : "No imminent expiries"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </Link>
      </div>

      {/* Charts Section */}
      <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Today's Hourly Sales (Rs.)
          </h3>
          <span className="text-[10px] text-gray-500">9 AM - 8 PM</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <XAxis
                dataKey="time"
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `Rs.${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#141418",
                  border: "1px solid #23232A",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(v: any) => [`Rs.${v}`, "Sales"]}
              />
              <Bar dataKey="sales" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent 5 Sales */}
      <div className="bg-pos-card border border-pos-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Recent Counter Sales
          </h3>
          <Link
            href="/admin/sales"
            className="text-xs text-teal-400 hover:text-teal-300 font-medium"
          >
            View All →
          </Link>
        </div>

        {sales.length === 0 ? (
          <p className="text-center py-6 text-xs text-gray-500">
            No sales recorded today yet.
          </p>
        ) : (
          <div className="divide-y divide-pos-border/60">
            {sales.slice(0, 6).map((sale) => (
              <div
                key={sale.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-mono font-bold text-white">
                    {sale.receipt_number}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(sale.created_at).toLocaleTimeString("en-PK", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" · "}
                    <span className="capitalize">{sale.payment_method}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-teal-400">
                    Rs.{parseFloat(sale.total_amount).toLocaleString()}
                  </p>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    Paid
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
