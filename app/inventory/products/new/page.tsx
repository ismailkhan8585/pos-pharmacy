"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { generateBarcode, PRODUCT_UNITS, KPK_CITIES } from "@/lib/pos-helpers"
import { Save, ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface ProductFormProps {
  isEdit?: boolean
  initialData?: any
}

export function ProductForm({ isEdit = false, initialData }: ProductFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])

  const [form, setForm] = useState({
    name_en: initialData?.name_en || "",
    name_ur: initialData?.name_ur || "",
    brand: initialData?.brand || "",
    category_id: initialData?.category_id || "",
    supplier_id: initialData?.supplier_id || "",
    barcode: initialData?.barcode || "",
    sku: initialData?.sku || "",
    sell_price: initialData?.sell_price || "",
    cost_price: initialData?.cost_price || "",
    stock: initialData?.stock || 0,
    low_stock_at: initialData?.low_stock_at || 10,
    unit: initialData?.unit || "pcs",
    requires_prescription: initialData?.requires_prescription || false,
    is_active: initialData?.is_active !== false,
    description: initialData?.description || "",
  })

  useEffect(() => {
    supabase.from("categories").select("id, name_en, icon").then(({ data }) => setCategories(data || []))
    supabase.from("suppliers").select("id, name").eq("is_active", true).then(({ data }) => setSuppliers(data || []))
  }, [])

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.name_en.trim()) {
      toast.error("Product name is required")
      return
    }
    if (!form.sell_price) {
      toast.error("Sell price is required")
      return
    }

    setIsSaving(true)
    try {
      const data: Record<string, any> = {
        name_en: form.name_en.trim(),
        name_ur: form.name_ur || null,
        brand: form.brand || null,
        category_id: form.category_id || null,
        barcode: form.barcode || null,
        sku: form.sku || null,
        sell_price: parseFloat(String(form.sell_price)),
        cost_price: parseFloat(String(form.cost_price)) || 0,
        stock: parseInt(String(form.stock)) || 0,
        low_stock_at: parseInt(String(form.low_stock_at)) || 10,
        unit: form.unit,
        requires_prescription: form.requires_prescription,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }

      if (isEdit && initialData?.id) {
        const { error } = await supabase.from("products").update(data).eq("id", initialData.id)
        if (error) throw error
        toast.success("Product updated")
      } else {
        const { error } = await supabase.from("products").insert(data)
        if (error) throw error
        toast.success("Product added")
      }

      // Sync freshly added/updated product into local IndexedDB
      try {
        const { refreshProductsFromCloud } = await import("@/lib/pos-sync")
        await refreshProductsFromCloud()
      } catch {}

      router.push("/inventory/products")
    } catch (err: any) {
      toast.error(err?.message || "Failed to save")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/inventory/products" className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-grotesk font-bold text-2xl text-white">
          {isEdit ? "Edit Product" : "Add New Product"}
        </h1>
      </div>

      <div className="space-y-6">
        {/* Section 1: Basic Info */}
        <section className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-4">
          <h2 className="font-grotesk font-semibold text-white text-sm border-b border-pos-border pb-2">Basic Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-gray-400 text-xs mb-1 block">Product Name (English) *</label>
              <input
                value={form.name_en}
                onChange={(e) => handleChange("name_en", e.target.value)}
                placeholder="e.g. Panadol 500mg"
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Product Name (Urdu)</label>
              <input
                value={form.name_ur}
                onChange={(e) => handleChange("name_ur", e.target.value)}
                placeholder="اردو نام"
                dir="rtl"
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50 font-urdu"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Brand</label>
              <input
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="e.g. GSK"
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => handleChange("category_id", e.target.value)}
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name_en}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Barcode</label>
              <div className="flex gap-2">
                <input
                  value={form.barcode}
                  onChange={(e) => handleChange("barcode", e.target.value)}
                  placeholder="Scan or type"
                  className="flex-1 h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50"
                />
                <button
                  onClick={() => handleChange("barcode", generateBarcode())}
                  className="h-10 w-10 flex items-center justify-center bg-pos-bg border border-pos-border rounded-xl text-gray-500 hover:text-teal-400 transition-colors"
                  title="Generate barcode"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Unit</label>
              <select
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
              >
                {PRODUCT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Supplier</label>
              <select
                value={form.supplier_id}
                onChange={(e) => handleChange("supplier_id", e.target.value)}
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requires_prescription}
                  onChange={(e) => handleChange("requires_prescription", e.target.checked)}
                  className="accent-blue-500"
                />
                <span className="text-gray-400 text-sm">Requires Rx</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                  className="accent-teal-500"
                />
                <span className="text-gray-400 text-sm">Active</span>
              </label>
            </div>
          </div>
        </section>

        {/* Section 2: Pricing & Stock */}
        <section className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-4">
          <h2 className="font-grotesk font-semibold text-white text-sm border-b border-pos-border pb-2">Pricing & Stock</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Sell Price (Rs.) *</label>
              <input
                type="number"
                value={form.sell_price}
                onChange={(e) => handleChange("sell_price", e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Cost Price (Rs.)</label>
              <input
                type="number"
                value={form.cost_price}
                onChange={(e) => handleChange("cost_price", e.target.value)}
                placeholder="0"
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Current Stock</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => handleChange("stock", e.target.value)}
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Low Stock Alert</label>
              <input
                type="number"
                value={form.low_stock_at}
                onChange={(e) => handleChange("low_stock_at", e.target.value)}
                className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:border-teal-500/50"
              />
            </div>
          </div>

          {form.sell_price && form.cost_price && parseFloat(String(form.cost_price)) > 0 && (
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-gray-500">Margin: </span>
              <span className="text-teal-400 font-mono font-bold">
                {(((parseFloat(String(form.sell_price)) - parseFloat(String(form.cost_price))) / parseFloat(String(form.sell_price))) * 100).toFixed(1)}%
              </span>
              <span className="text-gray-500 ml-3">Profit per unit: </span>
              <span className="text-teal-400 font-mono font-bold">
                Rs.{(parseFloat(String(form.sell_price)) - parseFloat(String(form.cost_price))).toFixed(0)}
              </span>
            </div>
          )}
        </section>

        {/* Description */}
        <section className="bg-pos-card border border-pos-border rounded-xl p-5">
          <h2 className="font-grotesk font-semibold text-white text-sm border-b border-pos-border pb-2 mb-4">Description (Optional)</h2>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Short description…"
            rows={3}
            className="w-full px-3 py-2 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50 resize-none"
          />
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving…" : isEdit ? "Update Product" : "Save Product"}
        </button>
      </div>
    </div>
  )
}

export default function NewProductPage() {
  return <ProductForm isEdit={false} />
}
