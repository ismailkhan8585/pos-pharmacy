"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { formatDateTime, getDateRange } from "@/lib/pos-helpers"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import {
  BarChart3,
  TrendingUp,
  ReceiptText,
  Calculator,
  BadgePercent,
  Banknote,
  Smartphone,
  Printer,
  RefreshCw,
  CloudOff,
  TriangleAlert,
  PackageX,
  ArrowRight,
} from "lucide-react"
import { PageHeader, StatCard, Segmented, EmptyState, btnSecondary } from "@/components/ui"

type Preset = "today" | "yesterday" | "week" | "month"

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
  IN_STORE: "Store Credit",
}
const fmt = (n: number) => Math.round(n || 0).toLocaleString("en-PK")
const BAR = "rgb(16 185 129)"

export default function ReportsPage() {
  const [preset, setPreset] = useState<Preset>("today")
  const [sales, setSales] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lowStockCount, setLowStockCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [offlineCount, setOfflineCount] = useState(0)
  const [loadError, setLoadError] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(false)
    const { from, to } = getDateRange(preset)
    let cloud: any[] = []

    try {
      const { data, error } = await supabase
        .from("sales")
        .select("id, receipt_number, total_amount, discount, payment_method, created_at, sale_items(product_name, quantity, unit_price, total_price)")
        .gte("created_at", from)
        .lte("created_at", to)
        .order("created_at", { ascending: false })
      if (error) throw error
      cloud = data || []

      const { data: stock } = await supabase.from("products").select("id, stock, low_stock_at").eq("is_active", true)
      setLowStockCount((stock || []).filter((p: any) => p.stock > 0 && p.stock <= p.low_stock_at).length)
      setOutOfStockCount((stock || []).filter((p: any) => p.stock <= 0).length)
    } catch (err) {
      console.error(err)
      setLoadError(true)
    }

    // Include sales made offline that haven't reached the cloud yet
    let local: any[] = []
    try {
      const { getAllPendingSales } = await import("@/lib/pos-db-local")
      const fromMs = new Date(from).getTime()
      const toMs = new Date(to).getTime()
      local = (await getAllPendingSales())
        .filter((s) => s.status !== "SYNCED" && s.createdAt >= fromMs && s.createdAt <= toMs)
        .map((s) => ({
          id: s.offlineSaleId,
          receipt_number: s.receiptNumber,
          total_amount: s.totalAmount,
          discount: s.discount,
          payment_method: s.paymentMethod,
          created_at: new Date(s.createdAt).toISOString(),
          sale_items: s.items.map((i) => ({
            product_name: i.productName,
            quantity: i.quantity,
            unit_price: i.unitPrice,
            total_price: i.totalPrice,
          })),
          offline: true,
        }))
    } catch {}

    setOfflineCount(local.length)
    setSales([...local, ...cloud].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)))
    setIsLoading(false)
  }, [preset])

  useEffect(() => {
    loadData()
  }, [loadData])

  const m = useMemo(() => {
    const num = (v: any) => parseFloat(v) || 0
    const revenue = sales.reduce((s, x) => s + num(x.total_amount), 0)
    const bills = sales.length
    const discount = sales.reduce((s, x) => s + num(x.discount), 0)
    const cash = sales.filter((s) => s.payment_method === "CASH").reduce((s, x) => s + num(x.total_amount), 0)

    const payments = Object.keys(METHOD_LABEL)
      .map((k) => ({
        key: k,
        name: METHOD_LABEL[k],
        value: sales.filter((s) => s.payment_method === k).reduce((s, x) => s + num(x.total_amount), 0),
        count: sales.filter((s) => s.payment_method === k).length,
      }))
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)

    const productMap: Record<string, { name: string; units: number; revenue: number }> = {}
    sales.forEach((sale) =>
      (sale.sale_items || []).forEach((item: any) => {
        const p = (productMap[item.product_name] ||= { name: item.product_name, units: 0, revenue: 0 })
        p.units += item.quantity
        p.revenue += num(item.total_price)
      })
    )
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)

    const hourly: Record<number, number> = {}
    sales.forEach((s) => {
      const h = new Date(s.created_at).getHours()
      hourly[h] = (hourly[h] || 0) + num(s.total_amount)
    })
    const hourlyData = Array.from({ length: 15 }, (_, i) => i + 8).map((h) => ({
      hour: `${h % 12 || 12}${h >= 12 ? "pm" : "am"}`,
      amount: Math.round(hourly[h] || 0),
    }))
    const peak = hourlyData.reduce((a, b) => (b.amount > a.amount ? b : a), hourlyData[0])

    return { revenue, bills, avg: bills ? revenue / bills : 0, discount, cash, digital: revenue - cash, payments, topProducts, hourlyData, peak }
  }, [sales])

  const rangeLabel = { today: "today", yesterday: "yesterday", week: "this week", month: "this month" }[preset]

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Reports"
        subtitle={`Sales performance ${rangeLabel}`}
        actions={
          <>
            <Segmented
              value={preset}
              onChange={setPreset}
              options={[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
                { value: "week", label: "This week" },
                { value: "month", label: "This month" },
              ]}
              className="min-w-90"
            />
            <button onClick={loadData} className={btnSecondary} title="Refresh">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => window.print()} className={btnSecondary}>
              <Printer className="w-4 h-4" /> Print
            </button>
          </>
        }
      />

      {(offlineCount > 0 || loadError) && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/25 bg-linear-to-r from-amber-500/10 to-transparent px-4 h-11 text-sm">
          <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-200">
            {loadError ? "Couldn't reach the cloud — showing sales saved on this device only." : `Includes ${offlineCount} offline sale${offlineCount > 1 ? "s" : ""} not yet synced.`}
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Revenue" value={`Rs ${fmt(m.revenue)}`} icon={TrendingUp} tone="teal" />
        <StatCard label="Bills" value={fmt(m.bills)} icon={ReceiptText} tone="sky" />
        <StatCard label="Avg bill" value={`Rs ${fmt(m.avg)}`} icon={Calculator} tone="purple" />
        <StatCard label="Discounts" value={`Rs ${fmt(m.discount)}`} icon={BadgePercent} tone="amber" />
        <StatCard label="Cash" value={`Rs ${fmt(m.cash)}`} icon={Banknote} tone="teal" />
        <StatCard label="Digital" value={`Rs ${fmt(m.digital)}`} icon={Smartphone} tone="sky" />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl surface p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-grotesk font-semibold text-white">Sales by hour</h3>
              <p className="text-xs text-gray-500 mt-0.5">Revenue in Rs, 8am – 10pm</p>
            </div>
            {m.peak?.amount > 0 && (
              <p className="text-xs text-gray-400">
                Busiest: <span className="text-white font-medium">{m.peak.hour}</span>
              </p>
            )}
          </div>
          {isLoading ? (
            <div className="h-55 rounded-xl bg-white/2 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={m.hourlyData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap={4}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#7a8191" }} axisLine={false} tickLine={false} interval={1} />
                <YAxis
                  tick={{ fontSize: 10, fill: "#7a8191" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "rgb(16 19 26)", border: "1px solid rgb(50 56 70)", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#9aa1b0" }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(v: any) => [`Rs ${fmt(v)}`, "Sales"]}
                />
                <Bar dataKey="amount" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment mix — labelled bars */}
        <div className="rounded-2xl surface p-5">
          <h3 className="font-grotesk font-semibold text-white">Payment mix</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-5">Share of revenue by method</p>
          {m.payments.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">No sales {rangeLabel}</p>
          ) : (
            <div className="space-y-4">
              {m.payments.map((p) => {
                const pct = m.revenue ? (p.value / m.revenue) * 100 : 0
                return (
                  <div key={p.key} title={`${p.count} bill(s)`}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="text-gray-200">{p.name}</span>
                      <span className="font-mono text-gray-400 text-xs">
                        <span className="text-white">Rs {fmt(p.value)}</span> · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BAR }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top products */}
        <div className="lg:col-span-2 rounded-2xl surface p-5">
          <h3 className="font-grotesk font-semibold text-white">Top products</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">By revenue {rangeLabel}</p>
          {m.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No products sold yet</p>
          ) : (
            <div className="space-y-3">
              {m.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-white/5 text-gray-400 font-mono text-[11px] flex items-center justify-center shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-sm text-gray-200 truncate">{p.name}</span>
                      <span className="text-xs text-gray-500 font-mono shrink-0">
                        {p.units} units · <span className="text-white">Rs {fmt(p.revenue)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.revenue / m.topProducts[0].revenue) * 100}%`, background: BAR }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock health */}
        <div className="space-y-3">
          <Link href="/inventory/products?filter=low" className="group block rounded-2xl border border-amber-500/20 bg-linear-to-br from-amber-500/10 to-transparent p-5 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] text-amber-300/80 font-semibold">Low stock</p>
              <TriangleAlert className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-mono text-3xl font-bold text-white mt-2">{lowStockCount}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 group-hover:text-amber-200">
              Review & reorder <ArrowRight className="w-3 h-3" />
            </p>
          </Link>
          <Link href="/inventory/products?filter=out" className="group block rounded-2xl border border-red-500/20 bg-linear-to-br from-red-500/10 to-transparent p-5 hover:border-red-500/40 transition-all">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.14em] text-red-300/80 font-semibold">Out of stock</p>
              <PackageX className="w-4 h-4 text-red-400" />
            </div>
            <p className="font-mono text-3xl font-bold text-white mt-2">{outOfStockCount}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1 group-hover:text-red-200">
              View items <ArrowRight className="w-3 h-3" />
            </p>
          </Link>
        </div>
      </div>

      {/* Sales table */}
      <div className="bg-pos-card border border-pos-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 h-14 border-b border-pos-border">
          <h3 className="font-grotesk font-semibold text-white">Transactions</h3>
          <span className="text-xs text-gray-500">{sales.length} sale{sales.length === 1 ? "" : "s"}</span>
        </div>
        {sales.length === 0 && !isLoading ? (
          <EmptyState icon={ReceiptText} title={`No sales ${rangeLabel}`} description="Completed sales will appear here." />
        ) : (
          <div className="max-h-105 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 backdrop-blur bg-pos-card/95">
                <tr>
                  <th className="text-left px-5 py-3">Receipt</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Items</th>
                  <th className="text-left px-4 py-3">Method</th>
                  <th className="text-right px-5 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t border-pos-border/60">
                    <td className="px-5 py-2.5 font-mono text-xs text-gray-200">
                      {sale.receipt_number || "—"}
                      {sale.offline && (
                        <span className="ml-2 text-[9px] font-sans font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded px-1">
                          OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(sale.created_at)}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{(sale.sale_items || []).length}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[11px] text-gray-300 bg-white/5 border border-white/10 rounded-md px-2 py-0.5">
                        {METHOD_LABEL[sale.payment_method] || sale.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-white text-sm tabular">Rs {fmt(sale.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
