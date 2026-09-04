"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Search, Receipt, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AdminSalesPage() {
  const [sales, setSales] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("sales")
      .select(`
        id, receipt_number, total_amount, payment_method,
        customer_name, created_at, is_returned,
        sale_items(id, product_name, quantity, unit_price, total_price)
      `)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSales(data || [])
        setIsLoading(false)
      })
  }, [])

  const filtered = sales.filter(
    (s) =>
      s.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      (s.customer_name &&
        s.customer_name.toLowerCase().includes(search.toLowerCase()))
  )

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
          <h2 className="text-xl font-bold font-grotesk text-white">Sales Log</h2>
          <p className="text-xs text-gray-400">All recent counter transactions</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by receipt or customer..."
          className="w-full h-10 pl-10 pr-4 bg-pos-card border border-pos-border rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500"
        />
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-xs text-gray-500">Loading sales...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-10 text-xs text-gray-500">No sales found.</p>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((sale) => (
            <div
              key={sale.id}
              className="p-3.5 bg-pos-card border border-pos-border rounded-2xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-white">
                  {sale.receipt_number}
                </span>
                <span className="font-mono font-bold text-sm text-teal-400">
                  Rs.{parseFloat(sale.total_amount).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  {new Date(sale.created_at).toLocaleDateString("en-PK", {
                    day: "2-digit",
                    month: "short",
                  })}{" "}
                  {new Date(sale.created_at).toLocaleTimeString("en-PK", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="capitalize px-2 py-0.5 rounded-md bg-pos-panel border border-pos-border font-medium text-gray-300">
                  {sale.payment_method}
                </span>
              </div>

              {sale.customer_name && (
                <p className="text-xs text-gray-300 font-medium">
                  👤 {sale.customer_name}
                </p>
              )}

              {sale.sale_items && sale.sale_items.length > 0 && (
                <div className="pt-2 border-t border-pos-border/40 text-[11px] text-gray-400 space-y-1">
                  {sale.sale_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="truncate mr-2">
                        {item.product_name} × {item.quantity}
                      </span>
                      <span className="font-mono text-gray-300">
                        Rs.{item.total_price}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
