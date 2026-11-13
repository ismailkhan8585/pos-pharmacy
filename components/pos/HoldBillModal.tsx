"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PauseCircle, Play, Trash2, Clock, ShoppingCart, UserRound, StickyNote, Inbox } from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"
import { usePOSProductsStore } from "@/stores/pos-products"
import { saveLocalHeldBill, getLocalHeldBills, deleteLocalHeldBill, LocalHeldBill } from "@/lib/pos-db-local"
import { Modal, Segmented, Field, EmptyState, inputCls } from "@/components/ui"
import { formatRelative } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
}

const fmt = (n: number) => n.toLocaleString("en-PK")

export default function HoldBillModal({ isOpen, onClose }: Props) {
  const items = usePOSCartStore((s) => s.items)
  const cartCustomer = usePOSCartStore((s) => s.customerName)
  const total = usePOSCartStore((s) => s.getTotal())
  const [activeTab, setActiveTab] = useState<"hold" | "list">("hold")
  const [note, setNote] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [heldBills, setHeldBills] = useState<LocalHeldBill[]>([])
  const [isLoadingBills, setIsLoadingBills] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const cartEmpty = items.length === 0

  const loadHeldBills = useCallback(async () => {
    setIsLoadingBills(true)
    try {
      const bills = await getLocalHeldBills()
      setHeldBills(bills.sort((a, b) => b.createdAt - a.createdAt))
      setActiveTab(usePOSCartStore.getState().items.length === 0 && bills.length > 0 ? "list" : "hold")
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingBills(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setCustomerName(cartCustomer || "")
      setNote("")
      setConfirmDelete(null)
      loadHeldBills()
    }
  }, [isOpen])

  const handleHoldCurrent = async () => {
    const cart = usePOSCartStore.getState()
    if (cart.items.length === 0) {
      toast.error("Current cart is empty")
      return
    }
    setIsSaving(true)
    try {
      const now = Date.now()
      await saveLocalHeldBill({
        id: crypto.randomUUID(),
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
        expiresAt: now + 24 * 60 * 60 * 1000,
      })
      cart.clearCart()
      cart.incrementBill()
      toast.success("Bill parked — resume it any time from Held Bills")
      onClose()
    } catch (err) {
      console.error(err)
      toast.error("Failed to hold bill")
    } finally {
      setIsSaving(false)
    }
  }

  const handleResumeBill = async (bill: LocalHeldBill) => {
    const cart = usePOSCartStore.getState()
    if (cart.items.length > 0 && !confirm("The current bill has items. Replace them with this held bill?")) return

    const products = usePOSProductsStore.getState().products
    cart.clearCart()
    const shortages: string[] = []

    for (const item of bill.items) {
      // Prefer live product data (current stock, unit, Rx flag); keep the held price
      const live = products.find((p) => p.id === item.productId)
      const stock = live ? live.stock : item.maxStock
      if (stock <= 0) {
        shortages.push(item.nameEn)
        continue
      }
      cart.addItem({
        ...(live || {
          id: item.productId,
          nameEn: item.nameEn,
          nameUr: item.nameUr,
          brand: null,
          unit: "pcs",
          requiresPrescription: false,
        }),
        sellPrice: item.unitPrice,
        stock,
      })
      if (item.quantity > 1) cart.updateQty(item.productId, item.quantity)
      if (item.quantity > stock) shortages.push(`${item.nameEn} (only ${stock})`)
    }

    // Restore the discount (stored as the amount that was applied)
    if (bill.discount > 0) cart.setDiscount(bill.discount, "AMOUNT")
    if (bill.customerName) cart.setCustomer(bill.customerName, "")
    if (bill.note) cart.setNotes(bill.note)

    await deleteLocalHeldBill(bill.id)
    if (shortages.length) toast(`Stock changed: ${shortages.join(", ")}`, { icon: "⚠️", duration: 4000 })
    toast.success(`Resumed ${bill.billNumber}`)
    onClose()
  }

  const handleDeleteBill = async (id: string) => {
    if (confirmDelete !== id) {
      setConfirmDelete(id)
      return
    }
    await deleteLocalHeldBill(id)
    setHeldBills((prev) => prev.filter((b) => b.id !== id))
    setConfirmDelete(null)
    toast.success("Held bill discarded")
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={PauseCircle}
      tone="sky"
      title="Held Bills"
      subtitle="Park a bill while the customer steps away — saved on this device"
      size="md"
    >
      <div className="p-5 space-y-4">
        <Segmented
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "hold", label: "Park current bill" },
            {
              value: "list",
              label: "Waiting",
              badge: (
                <span className="min-w-5 h-5 px-1.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-mono flex items-center justify-center">
                  {heldBills.length}
                </span>
              ),
            },
          ]}
        />

        {activeTab === "hold" &&
          (cartEmpty ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nothing to park"
              description="Add items to the bill first, then park it here."
              action={
                heldBills.length > 0 && (
                  <button onClick={() => setActiveTab("list")} className="text-xs text-sky-300 hover:text-sky-200">
                    View {heldBills.length} waiting bill{heldBills.length > 1 ? "s" : ""} →
                  </button>
                )
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-pos-border bg-pos-bg p-4">
                <div>
                  <p className="text-xs text-gray-500">{usePOSCartStore.getState().getBillNumber()}</p>
                  <p className="text-sm text-gray-200 mt-0.5">
                    {items.length} item{items.length > 1 ? "s" : ""}
                  </p>
                </div>
                <p className="font-mono text-2xl font-bold text-white tabular">Rs {fmt(total)}</p>
              </div>

              <Field label="Customer name (optional)">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Tariq Khan" className={inputCls} />
              </Field>

              <Field label="Note (optional)">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Went to the ATM"
                  rows={2}
                  className={`${inputCls} h-auto py-2.5 resize-none`}
                />
              </Field>

              <button
                onClick={handleHoldCurrent}
                disabled={isSaving}
                className="w-full h-12 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_10px_28px_-10px_rgba(14,165,233,0.7)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <PauseCircle className="w-5 h-5" />
                {isSaving ? "Parking…" : "Park Bill"}
              </button>
            </div>
          ))}

        {activeTab === "list" && (
          <div className="space-y-2.5">
            {isLoadingBills ? (
              Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-pos-card animate-pulse" />)
            ) : heldBills.length === 0 ? (
              <EmptyState icon={Inbox} title="No bills waiting" description="Parked bills appear here for 24 hours." />
            ) : (
              <AnimatePresence initial={false}>
                {heldBills.map((bill) => (
                  <motion.div
                    key={bill.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-2xl surface p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <UserRound className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{bill.customerName || "Walk-in customer"}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono mt-1 flex items-center gap-1.5">
                          {bill.billNumber} · {bill.items.length} item{bill.items.length > 1 ? "s" : ""} ·
                          <Clock className="w-3 h-3" /> {formatRelative(new Date(bill.createdAt))}
                        </p>
                      </div>
                      <p className="font-mono text-lg font-bold text-white tabular shrink-0">
                        Rs {fmt(bill.subtotal - bill.discount)}
                      </p>
                    </div>

                    {bill.note && (
                      <p className="text-xs text-gray-400 flex items-start gap-1.5 bg-pos-bg/60 rounded-lg px-2.5 py-2">
                        <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
                        {bill.note}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResumeBill(bill)}
                        className="flex-1 h-10 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </button>
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        onBlur={() => setConfirmDelete(null)}
                        className={`h-10 rounded-xl border text-sm flex items-center justify-center gap-1.5 transition-all ${
                          confirmDelete === bill.id
                            ? "px-3 bg-red-500/20 border-red-500/40 text-red-200"
                            : "w-10 bg-pos-card border-pos-border text-gray-500 hover:text-red-400 hover:border-red-500/30"
                        }`}
                        title="Discard"
                      >
                        <Trash2 className="w-4 h-4" />
                        {confirmDelete === bill.id && "Discard?"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
