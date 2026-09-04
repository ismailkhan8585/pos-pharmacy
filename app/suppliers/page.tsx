"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Plus, Phone, MessageCircle, Edit, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.from("suppliers").select("*").order("name").then(({ data }) => {
      setSuppliers(data || [])
      setIsLoading(false)
    })
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate supplier "${name}"?`)) return
    await supabase.from("suppliers").update({ is_active: false }).eq("id", id)
    setSuppliers((prev) => prev.filter((s) => s.id !== id))
    toast.success("Supplier deactivated")
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Suppliers</h1>
          <p className="text-gray-500 text-sm">{suppliers.length} suppliers</p>
        </div>
        <Link
          href="/suppliers/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 rounded-xl text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Supplier
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-600">Loading…</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12 text-gray-600">No suppliers yet</div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="bg-pos-card border border-pos-border rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 text-lg font-bold flex-shrink-0">
                {s.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium">{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {s.phone && <span className="text-gray-500 text-xs font-mono">{s.phone}</span>}
                  {s.city && <span className="text-gray-600 text-xs">{s.city}</span>}
                  {s.credit_days > 0 && <span className="text-blue-400 text-xs">{s.credit_days}d credit</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {s.whatsapp && (
                  <a
                    href={`https://wa.me/92${s.whatsapp.replace(/[^0-9]/g, "").slice(1)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-cardHover transition-all">
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <Link
                  href={`/suppliers/${s.id}`}
                  className="p-2 rounded-lg text-gray-500 hover:text-teal-400 hover:bg-teal-500/10 transition-all"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
