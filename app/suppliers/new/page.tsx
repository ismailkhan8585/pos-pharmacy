"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { KPK_CITIES } from "@/lib/pos-helpers"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

export default function NewSupplierPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: "", phone: "", whatsapp: "", address: "",
    city: "Swabi", credit_days: 0, credit_limit: 0, notes: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return }
    setIsSaving(true)
    try {
      await supabase.from("suppliers").insert({ ...form, is_active: true })
      toast.success("Supplier added")
      router.push("/suppliers")
    } catch { toast.error("Failed to save") }
    finally { setIsSaving(false) }
  }

  return (
    <div className="p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/suppliers" className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-grotesk font-bold text-2xl text-white">Add Supplier</h1>
      </div>

      <div className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-4">
        {[
          { field: "name", label: "Name *", placeholder: "Supplier name" },
          { field: "phone", label: "Phone", placeholder: "0300-0000000" },
          { field: "whatsapp", label: "WhatsApp", placeholder: "0300-0000000" },
          { field: "address", label: "Address", placeholder: "Street address" },
        ].map(({ field, label, placeholder }) => (
          <div key={field}>
            <label className="text-gray-400 text-xs mb-1 block">{label}</label>
            <input
              value={(form as any)[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
            />
          </div>
        ))}

        <div>
          <label className="text-gray-400 text-xs mb-1 block">City</label>
          <select
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
          >
            {KPK_CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Credit Days</label>
            <input
              type="number"
              value={form.credit_days}
              onChange={(e) => setForm((f) => ({ ...f, credit_days: parseInt(e.target.value) || 0 }))}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Credit Limit (Rs.)</label>
            <input
              type="number"
              value={form.credit_limit}
              onChange={(e) => setForm((f) => ({ ...f, credit_limit: parseFloat(e.target.value) || 0 }))}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-xs mb-1 block">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50 resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Saving…" : "Save Supplier"}
      </button>
    </div>
  )
}
