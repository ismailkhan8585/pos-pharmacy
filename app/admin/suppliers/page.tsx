"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { ArrowLeft, Phone, MessageCircle, Truck } from "lucide-react"
import Link from "next/link"

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase
      .from("suppliers")
      .select("*")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setSuppliers(data || [])
        setIsLoading(false)
      })
  }, [])

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
          <h2 className="text-xl font-bold font-grotesk text-white">Suppliers Directory</h2>
          <p className="text-xs text-gray-400">Distributor phone & WhatsApp contacts</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-xs text-gray-500">Loading distributors...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-center py-10 text-xs text-gray-500">No suppliers found.</p>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="p-4 bg-pos-card border border-pos-border rounded-2xl space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-white">{s.name}</h3>
                  <p className="text-[11px] text-gray-400">{s.city || "KPK, Pakistan"}</p>
                </div>
                {s.credit_terms && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pos-panel border border-pos-border text-teal-400 font-mono">
                    Terms: {s.credit_terms}
                  </span>
                )}
              </div>

              {s.address && (
                <p className="text-xs text-gray-400">{s.address}</p>
              )}

              <div className="flex items-center gap-2 pt-1 border-t border-pos-border/40">
                {s.phone && (
                  <a
                    href={`tel:${s.phone}`}
                    className="flex-1 h-9 rounded-xl bg-pos-panel hover:bg-pos-card border border-pos-border text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    Call: {s.phone}
                  </a>
                )}
                {s.whatsapp && (
                  <a
                    href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
