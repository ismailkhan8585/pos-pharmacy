"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Undo2, Search, Loader2, Check, Minus, Plus, ArrowLeft, Banknote, Smartphone, Wallet, CircleCheck, Circle } from "lucide-react"
import { supabase, processReturn } from "@/lib/supabase"
import { usePOSProductsStore } from "@/stores/pos-products"
import { Modal, Field, inputCls } from "@/components/ui"
import { formatDateTime } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
}

const RETURN_REASONS = ["Wrong item", "Damaged product", "Expired product", "Customer changed mind", "Doctor advice", "Other"]
const REFUND_METHODS = [
  { id: "CASH", label: "Cash", icon: Banknote },
  { id: "JAZZCASH", label: "JazzCash", icon: Smartphone },
  { id: "EASYPAISA", label: "EasyPaisa", icon: Wallet },
]
const STEPS = ["Find receipt", "Select items", "Done"]
const fmt = (n: number) => Number(n || 0).toLocaleString("en-PK")

export default function ReturnModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [foundSale, setFoundSale] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [isProcessing, setIsProcessing] = useState(false)
  const [refunded, setRefunded] = useState(0)
  const updateProductStock = usePOSProductsStore((s) => s.updateProductStock)

  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSearchTerm("")
      setFoundSale(null)
      setSelectedItems({})
      setReason("")
      setRefundMethod("CASH")
      setRefunded(0)
    }
  }, [isOpen])

  const handleSearch = async () => {
    const term = searchTerm.trim()
    if (!term) return
    setIsSearching(true)
    try {
      // 1. Local offline sales first
      const { getAllPendingSales } = await import("@/lib/pos-db-local")
      const localSales = await getAllPendingSales()
      const localMatch = localSales.find(
        (s) => s.receiptNumber.toLowerCase() === term.toLowerCase() || s.offlineSaleId === term
      )

      if (localMatch) {
        setFoundSale({
          id: localMatch.offlineSaleId,
          receipt_number: localMatch.receiptNumber,
          total_amount: localMatch.totalAmount,
          payment_method: localMatch.paymentMethod,
          customer_name: localMatch.customerName,
          created_at: new Date(localMatch.createdAt).toISOString(),
          is_returned: false,
          is_offline_sale: true,
          sale_items: localMatch.items.map((it, idx) => ({
            id: `local-item-${idx}`,
            product_id: it.productId,
            product_name: it.productName,
            quantity: it.quantity,
            unit_price: it.unitPrice,
            total_price: it.totalPrice,
          })),
        })
        setSelectedItems({})
        setStep(2)
        return
      }

      // 2. Cloud
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from("sales")
          .select(`
            id, receipt_number, total_amount, payment_method,
            customer_name, created_at, is_returned,
            sale_items(id, product_id, product_name, quantity, unit_price, total_price)
          `)
          .eq("receipt_number", term)
          .single()

        if (error || !data) {
          toast.error("Receipt not found")
          return
        }
        if (data.is_returned) {
          toast.error("This sale has already been returned")
          return
        }
        setFoundSale({ ...data, is_offline_sale: false })
        setSelectedItems({})
        setStep(2)
        return
      }

      toast.error("You're offline — only receipts made on this device can be found")
    } catch {
      toast.error("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const toggleItem = (item: any) =>
    setSelectedItems((prev) => {
      if (prev[item.id]) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      return { ...prev, [item.id]: item.quantity }
    })

  const setItemQty = (item: any, qty: number) =>
    setSelectedItems((prev) => {
      const q = Math.max(0, Math.min(item.quantity, qty))
      const next = { ...prev }
      if (q === 0) delete next[item.id]
      else next[item.id] = q
      return next
    })

  const refundAmount = foundSale
    ? foundSale.sale_items.reduce((sum: number, i: any) => sum + i.unit_price * (selectedItems[i.id] || 0), 0)
    : 0
  const selectedCount = Object.keys(selectedItems).length

  const handleProcess = async () => {
    if (!reason) return toast.error("Please select a reason")
    if (selectedCount === 0) return toast.error("Select at least one item to return")

    setIsProcessing(true)
    try {
      const returnItems = foundSale.sale_items
        .filter((i: any) => selectedItems[i.id])
        .map((i: any) => ({
          productId: i.product_id,
          productName: i.product_name,
          quantity: selectedItems[i.id],
          unitPrice: i.unit_price,
          totalPrice: i.unit_price * selectedItems[i.id],
        }))

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      const returnReceiptNum = `RTN-${foundSale.is_offline_sale ? "OFF-" : ""}${today}-${Math.floor(1000 + Math.random() * 9000)}`

      if (foundSale.is_offline_sale) {
        const { restoreLocalStock } = await import("@/lib/pos-db-local")
        for (const item of returnItems) {
          const newStock = await restoreLocalStock(item.productId, item.quantity, returnReceiptNum)
          updateProductStock(item.productId, newStock)
        }
      } else {
        if (!navigator.onLine) {
          toast.error("Internet connection required to return online sales")
          return
        }
        await processReturn({
          originalSaleId: foundSale.id,
          reason,
          refundAmount,
          refundMethod,
          items: returnItems,
        })
        const { updateLocalProductStock } = await import("@/lib/pos-db-local")
        const products = usePOSProductsStore.getState().products
        for (const item of returnItems) {
          const product = products.find((p) => p.id === item.productId)
          if (product) {
            const newStock = product.stock + item.quantity
            await updateLocalProductStock(item.productId, newStock)
            updateProductStock(item.productId, newStock)
          }
        }
      }
      setRefunded(refundAmount)
      toast.success(`Return processed · refund Rs ${fmt(refundAmount)}`)
      setStep(3)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Return failed")
    } finally {
      setIsProcessing(false)
    }
  }

  const stepper = (
    <div className="flex items-center gap-2 px-6 pt-5">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span
              className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                done ? "bg-amber-500 text-black" : active ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50" : "bg-pos-card text-gray-500"
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : n}
            </span>
            <span className={`text-xs whitespace-nowrap ${active ? "text-white font-medium" : "text-gray-500"}`}>{label}</span>
            {n < STEPS.length && <span className={`h-px flex-1 ${done ? "bg-amber-500/50" : "bg-pos-border"}`} />}
          </div>
        )
      })}
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} icon={Undo2} tone="amber" title="Returns & Refunds" subtitle="Find the original receipt to refund items" size="md">
      {stepper}
      <div className="p-6 space-y-5">
        {/* STEP 1 */}
        {step === 1 && (
          <>
            <Field label="Receipt number" hint="Printed at the top of the customer's receipt">
              <div className="flex gap-2">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="RCP-20260629-0001"
                  className={`${inputCls} font-mono focus:border-amber-500/60 focus:ring-amber-500/10`}
                  autoFocus
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="h-11 px-4 flex items-center gap-2 bg-amber-500 text-black font-semibold text-sm rounded-xl hover:bg-amber-400 transition-all disabled:opacity-40"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Find
                </button>
              </div>
            </Field>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && foundSale && (
          <>
            <div className="rounded-2xl border border-pos-border bg-pos-bg p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm text-white">{foundSale.receipt_number}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {formatDateTime(foundSale.created_at)}
                  {foundSale.customer_name && <> · {foundSale.customer_name}</>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Paid</p>
                <p className="font-mono text-white font-semibold">Rs {fmt(foundSale.total_amount)}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold mb-2">Items to return</p>
              <div className="space-y-1.5 max-h-55 overflow-y-auto pr-1">
                {foundSale.sale_items.map((item: any) => {
                  const qty = selectedItems[item.id] || 0
                  const on = qty > 0
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        on ? "border-amber-500/40 bg-amber-500/5" : "border-pos-border bg-pos-card"
                      }`}
                    >
                      <button onClick={() => toggleItem(item)} className="shrink-0">
                        {on ? <CircleCheck className="w-5 h-5 text-amber-400" /> : <Circle className="w-5 h-5 text-gray-600" />}
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => toggleItem(item)}>
                        <p className="text-sm text-white truncate cursor-pointer">{item.product_name}</p>
                        <p className="text-[11px] text-gray-500 font-mono">
                          Rs {fmt(item.unit_price)} × {item.quantity} sold
                        </p>
                      </div>
                      {on && item.quantity > 1 && (
                        <div className="flex items-center h-8 rounded-lg border border-pos-border bg-pos-bg overflow-hidden shrink-0">
                          <button onClick={() => setItemQty(item, qty - 1)} className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-mono text-sm text-white">{qty}</span>
                          <button onClick={() => setItemQty(item, qty + 1)} className="w-7 h-full flex items-center justify-center text-gray-400 hover:text-white">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className={`font-mono text-sm w-16 text-right shrink-0 ${on ? "text-amber-300" : "text-gray-500"}`}>
                        {fmt(item.unit_price * (on ? qty : item.quantity))}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold mb-2">Reason</p>
              <div className="flex flex-wrap gap-1.5">
                {RETURN_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`h-8 px-3 rounded-lg text-xs transition-all border ${
                      reason === r ? "bg-amber-500/15 text-amber-300 border-amber-500/40" : "bg-pos-card text-gray-400 border-pos-border hover:text-white"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold mb-2">Refund via</p>
              <div className="grid grid-cols-3 gap-2">
                {REFUND_METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setRefundMethod(id)}
                    className={`h-10 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-all ${
                      refundMethod === id ? "bg-teal-500/15 text-teal-300 border-teal-500/40" : "bg-pos-card text-gray-400 border-pos-border hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(1)}
                className="h-12 w-12 shrink-0 rounded-xl border border-pos-border bg-pos-card text-gray-400 hover:text-white flex items-center justify-center"
                title="Search another receipt"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleProcess}
                disabled={isProcessing || selectedCount === 0 || !reason}
                className="flex-1 h-12 flex items-center justify-between px-5 bg-amber-500 text-black rounded-xl font-semibold hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2">
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                  {isProcessing ? "Processing…" : "Refund"}
                </span>
                <span className="font-mono">Rs {fmt(refundAmount)}</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="text-center py-4 space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 16 }}
              className="w-16 h-16 rounded-2xl bg-amber-500 shadow-xl shadow-amber-500/30 flex items-center justify-center mx-auto"
            >
              <Check className="w-9 h-9 text-black" strokeWidth={3} />
            </motion.div>
            <p className="text-white font-grotesk font-bold text-xl">Return complete</p>
            <p className="text-gray-400 text-sm">
              Give back <span className="text-amber-300 font-mono font-semibold">Rs {fmt(refunded)}</span> via{" "}
              {REFUND_METHODS.find((m) => m.id === refundMethod)?.label}
            </p>
            <p className="text-gray-500 text-xs">Stock has been restored</p>
            <button onClick={onClose} className="mt-2 w-full h-11 bg-pos-card border border-pos-border rounded-xl text-gray-300 hover:text-white transition-all">
              Done
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
