"use client"

import { useState, useEffect } from "react"
import { supabase, receiveStock } from "@/lib/supabase"
import { Plus, Minus, Save, ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"
import { PageHeader } from "@/components/ui"
import { PackageCheck as HeaderIcon } from "lucide-react"

interface StockItem {
  productId: string
  productName: string
  quantity: number
  costPrice: number
  batchNumber: string
  expiryDate: string
  totalPrice: number
}

export default function ReceiveStockPage() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [supplier, setSupplier] = useState({ id: "", name: "" })
  const [items, setItems] = useState<StockItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState("CASH")
  const [paymentStatus, setPaymentStatus] = useState("PAID")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [productSearch, setProductSearch] = useState("")
  const [showProductSearch, setShowProductSearch] = useState(false)

  useEffect(() => {
    supabase.from("suppliers").select("id, name").eq("is_active", true).then(({ data }) => setSuppliers(data || []))
    supabase.from("products").select("id, name_en, cost_price, unit").eq("is_active", true).order("name_en").then(({ data }) => setProducts(data || []))
  }, [])

  const filteredProducts = products.filter(
    (p) => !productSearch || p.name_en.toLowerCase().includes(productSearch.toLowerCase())
  )

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      toast.error("Product already in list")
      return
    }
    setItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name_en,
        quantity: 1,
        costPrice: parseFloat(product.cost_price) || 0,
        batchNumber: "",
        expiryDate: "",
        totalPrice: parseFloat(product.cost_price) || 0,
      },
    ])
    setProductSearch("")
    setShowProductSearch(false)
  }

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item
        const updated = { ...item, [field]: value }
        updated.totalPrice = updated.quantity * updated.costPrice
        return updated
      })
    )
  }

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const grandTotal = items.reduce((sum, i) => sum + i.totalPrice, 0)

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Add at least one item")
      return
    }
    setIsSaving(true)
    try {
      await receiveStock({
        supplierId: supplier.id || null,
        supplierName: supplier.name || "Walk-in",
        totalAmount: grandTotal,
        paymentMethod,
        paymentStatus,
        notes,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          costPrice: i.costPrice,
          totalPrice: i.totalPrice,
          batchNumber: i.batchNumber || null,
          expiryDate: i.expiryDate || null,
        })),
      })
      toast.success(`Stock received! Total: Rs.${grandTotal}`)
      setItems([])
      setSupplier({ id: "", name: "" })
    } catch (err: any) {
      toast.error(err?.message || "Failed to receive stock")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory/products" className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <PageHeader icon={HeaderIcon} title="Receive Stock" subtitle="Add new stock from supplier" />
      </div>

      {/* Supplier Selection */}
      <div className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-3">
        <h2 className="font-grotesk font-semibold text-white text-sm">Supplier Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Supplier</label>
            <select
              value={supplier.id}
              onChange={(e) => {
                const s = suppliers.find((s) => s.id === e.target.value)
                setSupplier({ id: e.target.value, name: s?.name || "" })
              }}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
            >
              <option value="">Walk-in / Direct</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
            >
              <option>CASH</option>
              <option>BANK_TRANSFER</option>
              <option>CREDIT</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white outline-none"
            >
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="CREDIT">On Credit</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">Notes (optional)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Invoice number, notes…"
              className="w-full h-10 px-3 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-pos-card border border-pos-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-grotesk font-semibold text-white text-sm">Items Received</h2>
          <div className="relative">
            <button
              onClick={() => setShowProductSearch(!showProductSearch)}
              className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-xl text-sm hover:bg-teal-500/20 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
            {showProductSearch && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-pos-modal border border-pos-border rounded-xl shadow-2xl z-10">
                <div className="p-2">
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product…"
                    className="w-full h-9 px-3 bg-pos-card border border-pos-border rounded-lg text-sm text-white outline-none"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredProducts.slice(0, 10).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-pos-card hover:text-white transition-colors"
                    >
                      {p.name_en}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">Add products to receive stock</p>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 text-xs text-gray-500 px-2">
              <span>Product</span><span>Qty</span><span>Cost/Unit</span>
              <span>Batch</span><span>Expiry</span><span>Total</span>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center bg-pos-bg border border-pos-border rounded-xl p-2.5">
                <span className="text-white text-sm truncate">{item.productName}</span>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)}
                  min={1}
                  className="h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-sm font-mono text-white outline-none focus:border-teal-500/50 w-full"
                />
                <input
                  type="number"
                  value={item.costPrice}
                  onChange={(e) => updateItem(idx, "costPrice", parseFloat(e.target.value) || 0)}
                  className="h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-sm font-mono text-white outline-none focus:border-teal-500/50 w-full"
                />
                <input
                  value={item.batchNumber}
                  onChange={(e) => updateItem(idx, "batchNumber", e.target.value)}
                  placeholder="Batch#"
                  className="h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-xs text-white outline-none focus:border-teal-500/50 w-full"
                />
                <input
                  type="date"
                  value={item.expiryDate}
                  onChange={(e) => updateItem(idx, "expiryDate", e.target.value)}
                  className="h-8 px-2 bg-pos-card border border-pos-border rounded-lg text-xs text-white outline-none focus:border-teal-500/50 w-full"
                />
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-teal-400 text-sm w-16 text-right">Rs.{item.totalPrice.toFixed(0)}</span>
                  <button onClick={() => removeItem(idx)} className="text-gray-600 hover:text-red-400 transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-2 border-t border-pos-border">
              <span className="text-gray-500 text-sm">{items.length} items</span>
              <span className="font-mono text-teal-400 font-bold text-lg">Total: Rs.{grandTotal.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving || items.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors"
      >
        <Save className="w-4 h-4" />
        {isSaving ? "Processing…" : `Receive Stock (Rs.${grandTotal.toFixed(0)})`}
      </button>
    </div>
  )
}
