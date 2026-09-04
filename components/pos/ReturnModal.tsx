"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, RefreshCw, Search, Loader2 } from "lucide-react"
import { supabase, processReturn } from "@/lib/supabase"
import { usePOSProductsStore } from "@/stores/pos-products"
import toast from "react-hot-toast"
import { formatDateTime } from "@/lib/pos-helpers"

interface Props {
  isOpen: boolean
  onClose: () => void
}

const RETURN_REASONS = ["Wrong item", "Damaged product", "Expired product", "Customer changed mind", "Doctor advice", "Other"]

export default function ReturnModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [foundSale, setFoundSale] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState("")
  const [refundMethod, setRefundMethod] = useState("CASH")
  const [isProcessing, setIsProcessing] = useState(false)
  const { updateProductStock, products } = usePOSProductsStore()

  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setSearchTerm("")
      setFoundSale(null)
      setSelectedItems({})
      setReason("")
    }
  }, [isOpen])

  const handleSearch = async () => {
    const term = searchTerm.trim()
    if (!term) return
    setIsSearching(true)
    try {
      // 1. Check local IndexedDB first
      const { getAllPendingSales } = await import("@/lib/pos-db-local")
      const localSales = await getAllPendingSales()
      const localMatch = localSales.find(
        (s) =>
          s.receiptNumber.toLowerCase() === term.toLowerCase() ||
          s.offlineSaleId === term
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
        setStep(2)
        return
      }

      // 2. If online, search Supabase
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
          setFoundSale(null)
          return
        }

        if (data.is_returned) {
          toast.error("This sale has already been returned")
          setFoundSale(null)
          return
        }

        setFoundSale({ ...data, is_offline_sale: false })
        setStep(2)
        return
      }

      // 3. Not online and not found in local offline sales
      toast.error("Connect to internet to search online receipts")
      setFoundSale(null)
    } catch {
      toast.error("Search failed")
    } finally {
      setIsSearching(false)
    }
  }

  const toggleItem = (item: any) => {
    setSelectedItems((prev) => {
      if (prev[item.id]) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      return { ...prev, [item.id]: item.quantity }
    })
  }

  const refundAmount = foundSale
    ? foundSale.sale_items
        .filter((i: any) => selectedItems[i.id])
        .reduce((sum: number, i: any) => sum + i.unit_price * (selectedItems[i.id] || 0), 0)
    : 0

  const handleProcess = async () => {
    if (!reason) {
      toast.error("Please select a reason")
      return
    }
    if (Object.keys(selectedItems).length === 0) {
      toast.error("Select at least one item to return")
      return
    }

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
        // Restore stock in IndexedDB and Zustand
        const { restoreLocalStock } = await import("@/lib/pos-db-local")
        for (const item of returnItems) {
          const newStock = await restoreLocalStock(
            item.productId,
            item.quantity,
            returnReceiptNum
          )
          updateProductStock(item.productId, newStock)
        }
        toast.success(`⚡ Offline return processed! Refund: Rs.${refundAmount}`)
        setStep(3)
      } else {
        // Online sale return
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

        // Restore stock in local Zustand & IndexedDB
        const { updateLocalProductStock } = await import("@/lib/pos-db-local")
        for (const item of returnItems) {
          const product = products.find((p) => p.id === item.productId)
          if (product) {
            const newStock = product.stock + item.quantity
            await updateLocalProductStock(item.productId, newStock)
            updateProductStock(item.productId, newStock)
          }
        }

        toast.success(`Return processed. Refund: Rs.${refundAmount}`)
        setStep(3)
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Return failed")
    } finally {
      setIsProcessing(false)
    }
  }


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass border border-pos-border rounded-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-pos-border">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-400" />
                <h3 className="font-grotesk font-semibold text-white">
                  Returns & Refunds
                  <span className="text-gray-600 text-sm ml-2">Step {step}/3</span>
                </h3>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* STEP 1: Search */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-gray-400 text-sm">Enter the receipt number to find the original sale</p>
                  <div className="flex gap-2">
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="RCP-20250629-0001"
                      className="flex-1 h-10 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500/50 font-mono"
                      autoFocus
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching}
                      className="h-10 w-10 flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Select Items */}
              {step === 2 && foundSale && (
                <div className="space-y-3">
                  <div className="bg-pos-card border border-pos-border rounded-xl p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Receipt:</span>
                      <span className="font-mono text-white">{foundSale.receipt_number}</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-300">{formatDateTime(foundSale.created_at)}</span>
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-mono text-teal-400">Rs.{foundSale.total_amount}</span>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs">Select items to return:</p>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {foundSale.sale_items.map((item: any) => (
                      <label key={item.id} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-pos-card transition-colors">
                        <input
                          type="checkbox"
                          checked={!!selectedItems[item.id]}
                          onChange={() => toggleItem(item)}
                          className="accent-amber-500"
                        />
                        <span className="text-white text-sm flex-1 truncate">{item.product_name}</span>
                        <span className="text-gray-500 text-xs">×{item.quantity}</span>
                        <span className="font-mono text-white text-sm">Rs.{item.total_price}</span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="text-gray-500 text-xs mb-1.5 block">Reason *</label>
                    <div className="flex flex-wrap gap-1.5">
                      {RETURN_REASONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setReason(r)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                            reason === r
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-pos-card text-gray-500 border border-pos-border hover:text-white"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-500 text-xs mb-1 block">Refund Method</label>
                    <div className="flex gap-2">
                      {["CASH", "JAZZCASH", "EASYPAISA"].map((m) => (
                        <button
                          key={m}
                          onClick={() => setRefundMethod(m)}
                          className={`flex-1 h-9 rounded-xl text-xs transition-all ${
                            refundMethod === m
                              ? "bg-teal-500/20 text-teal-400 border border-teal-500/40"
                              : "bg-pos-card text-gray-500 border border-pos-border"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {refundAmount > 0 && (
                    <div className="flex justify-between items-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                      <span className="text-amber-400 text-sm">Refund Amount:</span>
                      <span className="font-mono text-amber-400 font-bold text-lg">Rs.{refundAmount}</span>
                    </div>
                  )}

                  <button
                    onClick={handleProcess}
                    disabled={isProcessing || Object.keys(selectedItems).length === 0 || !reason}
                    className="w-full h-11 flex items-center justify-center gap-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl font-medium hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : "Process Return"}
                  </button>
                </div>
              )}

              {/* STEP 3: Success */}
              {step === 3 && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <span className="text-3xl">✓</span>
                  </div>
                  <p className="text-white font-grotesk font-semibold text-lg">Return Processed!</p>
                  <p className="text-gray-500 text-sm">Refund of <span className="text-teal-400 font-mono">Rs.{refundAmount}</span> via {refundMethod}</p>
                  <p className="text-gray-600 text-xs">Stock has been restored</p>
                  <button
                    onClick={onClose}
                    className="mt-4 w-full h-10 bg-pos-card border border-pos-border rounded-xl text-gray-400 hover:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
