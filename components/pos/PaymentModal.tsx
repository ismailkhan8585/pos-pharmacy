"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, Loader2, Banknote, Smartphone, Wallet, Store, CircleCheck, Circle } from "lucide-react"
import { PaymentMethod, usePOSCartStore } from "@/stores/pos-cart"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSProductsStore } from "@/stores/pos-products"
import { usePOSConnectionStore } from "@/stores/pos-connection"
import { createSale, generateReceiptNumber } from "@/lib/supabase"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (receiptData: any) => void
}

const METHODS: {
  id: PaymentMethod
  label: string
  icon: typeof Banknote
  setting: "enableCash" | "enableJazzcash" | "enableEasypaisa" | "enableStore"
  active: string
}[] = [
  { id: "CASH", label: "Cash", icon: Banknote, setting: "enableCash", active: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300" },
  { id: "JAZZCASH", label: "JazzCash", icon: Smartphone, setting: "enableJazzcash", active: "border-orange-500/60 bg-orange-500/10 text-orange-300" },
  { id: "EASYPAISA", label: "EasyPaisa", icon: Wallet, setting: "enableEasypaisa", active: "border-teal-500/60 bg-teal-500/10 text-teal-300" },
  { id: "IN_STORE", label: "Store Credit", icon: Store, setting: "enableStore", active: "border-purple-500/60 bg-purple-500/10 text-purple-300" },
]

const fmt = (n: number) => n.toLocaleString("en-PK")

export default function PaymentModal({ isOpen, onClose, onSuccess }: Props) {
  const items = usePOSCartStore((s) => s.items)
  const paymentMethod = usePOSCartStore((s) => s.paymentMethod)
  const cashReceived = usePOSCartStore((s) => s.cashReceived)
  const customerName = usePOSCartStore((s) => s.customerName)
  usePOSCartStore((s) => s.discount)
  usePOSCartStore((s) => s.discountType)
  const { setPaymentMethod, setCashReceived, getSubtotal, getDiscountAmount, getTotal } = usePOSCartStore.getState()
  const settings = usePOSSettingsStore()

  const [isProcessing, setIsProcessing] = useState(false)
  const [digitalConfirmed, setDigitalConfirmed] = useState(false)
  const [cashText, setCashText] = useState("")
  const cashInputRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false) // synchronous guard against double-submit

  const subtotal = getSubtotal()
  const discountAmount = getDiscountAmount()
  const total = getTotal()

  const enabledMethods = METHODS.filter((m) => settings[m.setting] !== false)
  const isDigital = paymentMethod === "JAZZCASH" || paymentMethod === "EASYPAISA"

  // Empty cash field = customer paid the exact amount
  const tendered = paymentMethod === "CASH" ? (cashReceived > 0 ? cashReceived : total) : 0
  const change = paymentMethod === "CASH" ? Math.max(0, tendered - total) : 0
  const cashShort = paymentMethod === "CASH" && tendered < total

  const canComplete =
    !isProcessing &&
    items.length > 0 &&
    (paymentMethod === "CASH" ? !cashShort : isDigital ? digitalConfirmed : true)

  const quickAmounts = Array.from(
    new Set([100, 500, 1000, 5000].map((step) => Math.ceil(total / step) * step))
  )
    .filter((v) => v > total)
    .slice(0, 3)

  // Reset per-checkout state each time the dialog opens
  useEffect(() => {
    if (!isOpen) return
    setDigitalConfirmed(false)
    setIsProcessing(false)
    submittingRef.current = false
    setCashText(cashReceived > 0 ? String(cashReceived) : "")
    if (!enabledMethods.some((m) => m.id === paymentMethod) && enabledMethods[0]) {
      setPaymentMethod(enabledMethods[0].id)
    }
    const t = setTimeout(() => cashInputRef.current?.focus(), 120)
    return () => clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && paymentMethod === "CASH") setTimeout(() => cashInputRef.current?.focus(), 50)
  }, [paymentMethod])

  const setCash = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "")
    setCashText(clean)
    setCashReceived(parseInt(clean) || 0)
  }

  // ─── Sale processing ────────────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!canComplete) {
      if (cashShort) toast.error(`Cash is Rs ${fmt(total - tendered)} short`)
      else if (isDigital && !digitalConfirmed) toast.error("Confirm the payment was received first")
      return
    }
    if (submittingRef.current) return
    submittingRef.current = true
    setIsProcessing(true)

    // Snapshot everything once so the sale is consistent even as stores change
    const cart = usePOSCartStore.getState()
    const shift = usePOSShiftStore.getState()
    const productsStore = usePOSProductsStore.getState()
    const method = cart.paymentMethod
    const snapItems = cart.items
    const snapSubtotal = cart.getSubtotal()
    const snapDiscount = cart.getDiscountAmount()
    const snapTotal = cart.getTotal()
    const cashIn = method === "CASH" ? (cart.cashReceived > 0 ? cart.cashReceived : snapTotal) : null
    const changeOut = cashIn !== null ? Math.max(0, cashIn - snapTotal) : null

    let receiptNumber = ""
    let isOffline = !usePOSConnectionStore.getState().isOnline

    // 1) Try cloud first — only the cloud write itself may fall back to offline
    if (!isOffline) {
      try {
        receiptNumber = await generateReceiptNumber()
        await createSale({
          receiptNumber,
          subtotal: snapSubtotal,
          discount: snapDiscount,
          discountType: cart.discountType,
          total: snapTotal,
          paymentMethod: method,
          cashReceived: cashIn,
          changeGiven: changeOut,
          customerName: cart.customerName || null,
          customerPhone: cart.customerPhone || null,
          notes: cart.notes || null,
          shiftId: shift.currentShift.id || null,
          items: snapItems.map((i) => ({
            productId: i.productId,
            nameEn: i.nameEn,
            nameUr: i.nameUr,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
        })
      } catch (error) {
        console.warn("Online sale failed, saving offline:", error)
        toast("Cloud unavailable — sale saved on this device", { icon: "⚡" })
        isOffline = true
      }
    }

    try {
      const db = await import("@/lib/pos-db-local")

      if (isOffline) {
        // 2a) Offline: queue the sale and deduct stock locally
        receiptNumber = await db.getNextOfflineReceiptNumber()
        await db.savePendingSale({
          offlineSaleId: crypto.randomUUID(),
          receiptNumber,
          items: snapItems.map((i) => ({
            productId: i.productId,
            productName: i.nameEn,
            productNameUr: i.nameUr || null,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
          subtotal: snapSubtotal,
          discount: snapDiscount,
          discountType: cart.discountType,
          totalAmount: snapTotal,
          paymentMethod: method,
          cashReceived: cashIn,
          changeGiven: changeOut,
          customerName: cart.customerName || null,
          customerPhone: cart.customerPhone || null,
          notes: cart.notes || null,
          shiftId: shift.currentShift.id || null,
          status: "PENDING" as const,
          createdAt: Date.now(),
          syncedAt: null,
          syncError: null,
          retryCount: 0,
        })
        for (const item of snapItems) {
          const newStock = await db.deductLocalStock(item.productId, item.quantity, receiptNumber)
          productsStore.updateProductStock(item.productId, newStock)
        }
        const stats = await db.getLocalDB_Stats()
        usePOSConnectionStore.getState().setPendingCount(stats.pending)
      } else {
        // 2b) Online: sale is recorded — mirror stock locally (failures here must NOT re-save the sale)
        for (const item of snapItems) {
          const current = productsStore.products.find((p) => p.id === item.productId)?.stock ?? 0
          const newStock = Math.max(0, current - item.quantity)
          productsStore.updateProductStock(item.productId, newStock)
          try {
            await db.updateLocalProductStock(item.productId, newStock)
          } catch (e) {
            console.warn("Local stock cache update failed:", e)
          }
        }
      }
    } catch (err) {
      console.error("Offline sale error:", err)
      toast.error("Could not save the sale — please try again")
      setIsProcessing(false)
      submittingRef.current = false
      return
    }

    // 3) Shift totals, receipt, reset cart
    shift.addSaleToShift(snapTotal, snapDiscount, method)

    const now = new Date()
    const receiptData = {
      receiptNumber,
      date: now.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }),
      time: now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true }),
      items: snapItems.map((i) => ({ name: i.nameEn, qty: i.quantity, unitPrice: i.unitPrice, total: i.totalPrice })),
      subtotal: snapSubtotal,
      discount: snapDiscount,
      discountType: cart.discountType,
      total: snapTotal,
      paymentMethod: method,
      cashReceived: cashIn ?? undefined,
      changeGiven: changeOut ?? undefined,
      customerName: cart.customerName,
      isOffline,
      settings: {
        storeName: settings.storeName,
        ownerName: settings.ownerName,
        address: settings.address,
        phone: settings.phone,
        drugLicense: settings.drugLicense,
        receiptFooter: settings.receiptFooter,
        currencySymbol: settings.currencySymbol,
      },
    }

    cart.incrementBill()
    cart.clearCart()
    setIsProcessing(false)
    submittingRef.current = false
    toast.success(`Sale complete · Rs ${fmt(snapTotal)}`)
    onSuccess(receiptData)
  }

  // Keyboard: Enter = complete, Esc = close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleComplete()
      } else if (e.key === "Escape" && !isProcessing) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  const digitalNumber =
    paymentMethod === "JAZZCASH" ? settings.jazzcashNumber : paymentMethod === "EASYPAISA" ? settings.easypaisaNumber : ""

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass border border-pos-borderHi rounded-3xl w-full max-w-205 max-h-[92vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-16 border-b border-pos-border shrink-0">
              <div>
                <h3 className="font-grotesk font-bold text-white text-lg leading-tight">Checkout</h3>
                <p className="text-xs text-gray-500">
                  {items.length} item{items.length === 1 ? "" : "s"}
                  {customerName && <> · for <span className="text-gray-300">{customerName}</span></>}
                </p>
              </div>
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 h-9 px-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs"
                >
                  <span className="kbd">Esc</span>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-[1fr_1.15fr] flex-1 min-h-0 overflow-y-auto">
              {/* LEFT: Order summary */}
              <div className="p-6 border-b md:border-b-0 md:border-r border-pos-border flex flex-col min-h-0 bg-pos-bg/40">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold mb-3">Order summary</p>
                <div className="space-y-2 overflow-y-auto max-h-65 pr-1 -mr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-baseline gap-2 text-sm">
                      <span className="text-gray-300 truncate flex-1">{item.nameEn}</span>
                      <span className="text-gray-500 text-xs font-mono shrink-0">×{item.quantity}</span>
                      <span className="font-mono text-white w-20 text-right tabular shrink-0">{fmt(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 space-y-1.5 border-t border-dashed border-pos-border">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-mono tabular">Rs {fmt(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-400">
                      <span>Discount</span>
                      <span className="font-mono tabular">− Rs {fmt(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-2">
                    <span className="text-xs uppercase tracking-[0.14em] text-gray-400 font-semibold">Amount due</span>
                    <span className="font-mono text-3xl font-bold text-white tabular leading-none">
                      <span className="text-base text-gray-500 mr-1">Rs</span>
                      {fmt(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Payment */}
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold mb-3">Payment method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {enabledMethods.map((m) => {
                      const Icon = m.icon
                      const active = paymentMethod === m.id
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setPaymentMethod(m.id)
                            setDigitalConfirmed(false)
                          }}
                          className={`flex items-center gap-2.5 h-12 px-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                            active ? m.active : "border-pos-border bg-pos-card text-gray-400 hover:text-white hover:border-pos-borderHi"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {m.label}
                          {active && <CircleCheck className="w-4 h-4 ml-auto" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* CASH */}
                {paymentMethod === "CASH" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-gray-500 font-semibold">Cash received</span>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">Rs</span>
                        <input
                          ref={cashInputRef}
                          type="text"
                          inputMode="numeric"
                          value={cashText}
                          onChange={(e) => setCash(e.target.value)}
                          placeholder={`${fmt(total)} (exact)`}
                          className="w-full h-14 pl-12 pr-4 bg-pos-bg border border-pos-border rounded-2xl text-2xl font-mono font-bold text-white placeholder-gray-600 focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10 tabular"
                        />
                      </div>
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setCash("")}
                        className={`flex-1 h-9 rounded-xl text-xs font-semibold border transition-all ${
                          !cashText ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-pos-border bg-pos-card text-gray-400 hover:text-white"
                        }`}
                      >
                        Exact
                      </button>
                      {quickAmounts.map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCash(String(amt))}
                          className={`flex-1 h-9 rounded-xl text-xs font-mono border transition-all ${
                            cashReceived === amt ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-pos-border bg-pos-card text-gray-400 hover:text-white"
                          }`}
                        >
                          {fmt(amt)}
                        </button>
                      ))}
                    </div>

                    <div
                      className={`flex items-center justify-between rounded-2xl px-4 h-16 border ${
                        cashShort ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/25"
                      }`}
                    >
                      <span className={`text-sm font-medium ${cashShort ? "text-red-300" : "text-amber-200"}`}>
                        {cashShort ? "Still due" : "Change to return"}
                      </span>
                      <span className={`font-mono text-3xl font-bold tabular ${cashShort ? "text-red-300" : "text-amber-300"}`}>
                        Rs {fmt(cashShort ? total - tendered : change)}
                      </span>
                    </div>
                  </div>
                )}

                {/* DIGITAL */}
                {isDigital && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-pos-border bg-pos-bg p-4">
                      <p className="text-xs text-gray-500">Ask the customer to send</p>
                      <p className="font-mono text-2xl font-bold text-white mt-1 tabular">Rs {fmt(total)}</p>
                      <p className="text-xs text-gray-500 mt-3">
                        to {paymentMethod === "JAZZCASH" ? "JazzCash" : "EasyPaisa"} account
                      </p>
                      <p className={`font-mono text-lg font-semibold mt-0.5 ${digitalNumber ? "text-white" : "text-amber-300 text-sm"}`}>
                        {digitalNumber || "No number set — add it in Settings"}
                      </p>
                    </div>
                    <button
                      onClick={() => setDigitalConfirmed((v) => !v)}
                      className={`w-full flex items-center gap-3 h-12 px-4 rounded-xl border text-sm font-medium transition-all ${
                        digitalConfirmed
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-pos-border bg-pos-card text-gray-300 hover:border-pos-borderHi"
                      }`}
                    >
                      {digitalConfirmed ? <CircleCheck className="w-5 h-5" /> : <Circle className="w-5 h-5 text-gray-500" />}
                      I've received the payment confirmation
                    </button>
                  </div>
                )}

                {/* STORE CREDIT */}
                {paymentMethod === "IN_STORE" && (
                  <div className="rounded-2xl border border-purple-500/25 bg-purple-500/5 p-4 text-sm text-gray-300">
                    The amount will be recorded as <span className="text-purple-300 font-medium">store credit</span>.
                    {!customerName && (
                      <p className="text-xs text-amber-300 mt-2">Tip: add the customer's name on the bill so you know who owes it.</p>
                    )}
                  </div>
                )}

                {/* Complete */}
                <motion.button
                  whileTap={canComplete ? { scale: 0.985 } : {}}
                  onClick={handleComplete}
                  disabled={!canComplete}
                  className={`mt-auto w-full h-14 rounded-2xl font-grotesk font-bold text-white text-base flex items-center justify-center gap-2 transition-all duration-200 ${
                    canComplete
                      ? "bg-linear-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-[0_12px_32px_-8px_rgba(16,185,129,0.6)]"
                      : "bg-pos-card border border-pos-border text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Complete Sale · Rs {fmt(total)}
                      <span className="kbd ml-2 bg-white/15! border-white/20! text-white!">Enter</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
