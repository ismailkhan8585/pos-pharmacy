"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Bookmark, Play, Trash2, Clock, ShoppingCart } from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"
import {
  saveLocalHeldBill,
  getLocalHeldBills,
  deleteLocalHeldBill,
  LocalHeldBill,
} from "@/lib/pos-db-local"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function HoldBillModal({ isOpen, onClose }: Props) {
  const cart = usePOSCartStore()
  const [activeTab, setActiveTab] = useState<"hold" | "list">("hold")
  const [note, setNote] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [heldBills, setHeldBills] = useState<LocalHeldBill[]>([])
  const [isLoadingBills, setIsLoadingBills] = useState(false)

  const loadHeldBills = useCallback(async () => {
    setIsLoadingBills(true)
    try {
      const bills = await getLocalHeldBills()
      setHeldBills(bills.sort((a, b) => b.createdAt - a.createdAt))
      if (cart.isEmpty() && bills.length > 0) {
        setActiveTab("list")
      } else {
        setActiveTab("hold")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingBills(false)
    }
  }, [cart])

  useEffect(() => {
    if (isOpen) {
      setCustomerName(cart.customerName || "")
      setNote("")
      loadHeldBills()
    }
  }, [isOpen, loadHeldBills, cart.customerName])

  const handleHoldCurrent = async () => {
    if (cart.isEmpty()) {
      toast.error("Current cart is empty")
      return
    }

    setIsSaving(true)
    try {
      const id = crypto.randomUUID()
      const now = Date.now()
      const expiresAt = now + 24 * 60 * 60 * 1000 // 24 hours

      const localBill: LocalHeldBill = {
        id,
        billNumber: cart.getBillNumber(),
        customerName: customerName || null,
        note: note || null,
        items: cart.items.map((i) => ({
          productId: i.productId,
          nameEn: i.nameEn,
          nameUr: i.nameUr || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          maxStock: i.maxStock,
        })),
        subtotal: cart.getSubtotal(),
        discount: cart.getDiscountAmount(),
        discountType: cart.discountType,
        createdAt: now,
        expiresAt,
      }

      await saveLocalHeldBill(localBill)

      cart.clearCart()
      cart.incrementBill()
      toast.success("Bill held locally!")
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error("Failed to hold bill")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResumeBill = async (bill: LocalHeldBill) => {
    if (!cart.isEmpty()) {
      if (
        !confirm(
          "Current cart has items. Replace with held bill items?"
        )
      ) {
        return
      }
    }

    // Restore to cart
    cart.clearCart()
    for (const item of bill.items) {
      cart.addItem({
        id: item.productId,
        nameEn: item.nameEn,
        nameUr: item.nameUr,
        brand: null,
        categoryId: null,
        categoryName: null,
        categoryIcon: null,
        barcode: null,
        sku: null,
        sellPrice: item.unitPrice,
        costPrice: 0,
        stock: item.maxStock,
        lowStockAt: 5,
        unit: "pcs",
        requiresPrescription: false,
        batches: [],
      })
      if (item.quantity > 1) {
        cart.updateQty(item.productId, item.quantity)
      }
    }

    if (bill.customerName) {
      cart.setCustomer(bill.customerName, "")
    }

    // Delete from IndexedDB
    await deleteLocalHeldBill(bill.id)
    toast.success(`Resumed bill ${bill.billNumber}`)
    onClose()
  }

  const handleDeleteBill = async (id: string) => {
    if (confirm("Delete this held bill?")) {
      await deleteLocalHeldBill(id)
      setHeldBills((prev) => prev.filter((b) => b.id !== id))
      toast.success("Held bill deleted")
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-pos-panel border border-pos-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-pos-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="font-grotesk font-semibold text-white">
                  Held Bills Management
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-pos-border bg-pos-card/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("hold")}
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition-all border-b-2 ${
                  activeTab === "hold"
                    ? "border-amber-400 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                Hold Current Cart
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className={`flex-1 py-2.5 text-xs font-semibold text-center transition-all border-b-2 flex items-center justify-center gap-1.5 ${
                  activeTab === "list"
                    ? "border-amber-400 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span>Active Held Bills</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-400">
                  {heldBills.length}
                </span>
              </button>
            </div>

            {/* Tab 1: Hold Current Cart */}
            {activeTab === "hold" && (
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {cart.isEmpty() ? (
                  <div className="text-center py-8 space-y-2 text-gray-500">
                    <ShoppingCart className="w-8 h-8 mx-auto text-gray-600" />
                    <p className="text-sm">Current cart is empty.</p>
                    <p className="text-xs">Add items to bill before holding.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-pos-card border border-pos-border rounded-xl p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          Bill: {cart.getBillNumber()}
                        </span>
                        <span className="font-mono text-white font-semibold">
                          {cart.getItemCount()} item(s)
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-pos-border/50">
                        <span className="text-gray-400 text-xs">Total Amount:</span>
                        <span className="font-mono text-teal-400 font-bold text-sm">
                          Rs.{cart.getTotal()}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block font-medium">
                        Customer Name (Optional)
                      </label>
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Tariq Khan"
                        className="w-full h-10 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500/60"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs mb-1.5 block font-medium">
                        Quick Note (Optional)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Customer stepped out to ATM"
                        rows={2}
                        className="w-full px-3 py-2 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-amber-500/60 resize-none"
                      />
                    </div>

                    <p className="text-gray-500 text-[11px] text-center">
                      Saved locally in browser · Accessible even without internet
                    </p>

                    <button
                      onClick={handleHoldCurrent}
                      disabled={isSaving}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "📋 Park & Hold Bill"}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Tab 2: Active Held Bills List */}
            {activeTab === "list" && (
              <div className="p-4 space-y-3 overflow-y-auto flex-1">
                {isLoadingBills ? (
                  <p className="text-center py-6 text-xs text-gray-500">
                    Loading held bills...
                  </p>
                ) : heldBills.length === 0 ? (
                  <div className="text-center py-10 space-y-2 text-gray-500">
                    <Bookmark className="w-8 h-8 mx-auto text-gray-600" />
                    <p className="text-sm font-medium">No held bills found</p>
                    <p className="text-xs">
                      Parked bills will appear here for 24 hours.
                    </p>
                  </div>
                ) : (
                  heldBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="bg-pos-card border border-pos-border rounded-xl p-3.5 space-y-2 hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">
                          {bill.billNumber}
                        </span>
                        <span className="font-mono text-xs font-bold text-teal-400">
                          Rs.{bill.subtotal - bill.discount}
                        </span>
                      </div>

                      {bill.customerName && (
                        <p className="text-xs text-gray-300 font-medium">
                          👤 {bill.customerName}
                        </p>
                      )}

                      {bill.note && (
                        <p className="text-[11px] text-gray-400 italic">
                          "{bill.note}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-pos-border/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(bill.createdAt).toLocaleTimeString("en-PK", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>{bill.items.length} item(s)</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleResumeBill(bill)}
                          className="flex-1 h-8 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Play className="w-3 h-3" />
                          Resume Bill
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="h-8 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs transition-all"
                          title="Discard held bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
