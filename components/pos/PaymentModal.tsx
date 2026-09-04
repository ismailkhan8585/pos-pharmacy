"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, Loader2 } from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"
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

const METHOD_COLORS: Record<string, string> = {
  CASH:      "bg-green-500/10 text-green-400 border-green-500/30",
  JAZZCASH:  "bg-orange-500/10 text-orange-400 border-orange-500/30",
  EASYPAISA: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  IN_STORE:  "bg-purple-500/10 text-purple-400 border-purple-500/30",
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "💵 Cash", JAZZCASH: "📱 JazzCash",
  EASYPAISA: "📲 EasyPaisa", IN_STORE: "🏪 Store Credit",
}

export default function PaymentModal({ isOpen, onClose, onSuccess }: Props) {
  const cart = usePOSCartStore()
  const settings = usePOSSettingsStore()
  const { currentShift, addSaleToShift } = usePOSShiftStore()
  const { updateProductStock, products } = usePOSProductsStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [digitalConfirmed, setDigitalConfirmed] = useState(false)

  const subtotal = cart.getSubtotal()
  const discountAmount = cart.getDiscountAmount()
  const total = cart.getTotal()
  const change = cart.getChangeGiven()
  const isDigital = cart.paymentMethod === "JAZZCASH" || cart.paymentMethod === "EASYPAISA"

  const canComplete =
    !isProcessing &&
    (cart.paymentMethod === "CASH"
      ? cart.cashReceived >= total
      : cart.paymentMethod === "IN_STORE"
      ? true
      : digitalConfirmed)

  const processOnlineSale = async () => {
    try {
      const receiptNumber = await generateReceiptNumber()

      const saleData = {
        receiptNumber,
        subtotal,
        discount: discountAmount,
        discountType: cart.discountType,
        total,
        paymentMethod: cart.paymentMethod,
        cashReceived: cart.paymentMethod === "CASH" ? cart.cashReceived : null,
        changeGiven: cart.paymentMethod === "CASH" ? change : null,
        customerName: cart.customerName || null,
        customerPhone: cart.customerPhone || null,
        notes: cart.notes || null,
        shiftId: currentShift.id || null,
        items: cart.items.map((item) => ({
          productId: item.productId,
          nameEn: item.nameEn,
          nameUr: item.nameUr,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      }

      await createSale(saleData)

      // Update local stock in IndexedDB and Zustand
      const { updateLocalProductStock } = await import("@/lib/pos-db-local")
      for (const item of cart.items) {
        const product = products.find((p) => p.id === item.productId)
        const currentStock = product ? product.stock : 0
        const newStock = Math.max(0, currentStock - item.quantity)
        await updateLocalProductStock(item.productId, newStock)
        updateProductStock(item.productId, newStock)
      }

      // Update shift totals
      addSaleToShift(total, discountAmount, cart.paymentMethod)

      const receiptData = {
        receiptNumber,
        date: new Date().toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        items: cart.items.map((i) => ({
          name: i.nameEn,
          qty: i.quantity,
          unitPrice: i.unitPrice,
          total: i.totalPrice,
        })),
        subtotal,
        discount: discountAmount,
        discountType: cart.discountType,
        total,
        paymentMethod: cart.paymentMethod,
        cashReceived: cart.paymentMethod === "CASH" ? cart.cashReceived : undefined,
        changeGiven: cart.paymentMethod === "CASH" ? change : undefined,
        customerName: cart.customerName,
        isOffline: false,
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
      toast.success(`Sale complete! Rs.${total}`)
      onSuccess(receiptData)
    } catch (error: any) {
      console.warn("Online sale failed, switching to offline sale:", error)
      toast("Cloud connection unavailable — saving sale offline", { icon: "⚡" })
      await processOfflineSale()
    }
  }

  const processOfflineSale = async () => {
    try {
      const {
        getNextOfflineReceiptNumber,
        savePendingSale,
        deductLocalStock,
        getLocalDB_Stats,
      } = await import("@/lib/pos-db-local")

      const receiptNumber = await getNextOfflineReceiptNumber()
      const offlineSaleId = crypto.randomUUID()

      const pendingSale = {
        offlineSaleId,
        receiptNumber,
        items: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.nameEn,
          productNameUr: item.nameUr || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        subtotal,
        discount: discountAmount,
        discountType: cart.discountType,
        totalAmount: total,
        paymentMethod: cart.paymentMethod,
        cashReceived: cart.paymentMethod === "CASH" ? cart.cashReceived : null,
        changeGiven: cart.paymentMethod === "CASH" ? change : null,
        customerName: cart.customerName || null,
        customerPhone: cart.customerPhone || null,
        notes: cart.notes || null,
        shiftId: currentShift.id || null,
        status: "PENDING" as const,
        createdAt: Date.now(),
        syncedAt: null,
        syncError: null,
        retryCount: 0,
      }

      await savePendingSale(pendingSale)

      // Deduct stock from IndexedDB + Zustand
      for (const item of cart.items) {
        const newStock = await deductLocalStock(
          item.productId,
          item.quantity,
          receiptNumber
        )
        updateProductStock(item.productId, newStock)
      }

      // Update pending count in connection store
      const stats = await getLocalDB_Stats()
      usePOSConnectionStore.getState().setPendingCount(stats.pending)

      // Update shift totals
      addSaleToShift(total, discountAmount, cart.paymentMethod)

      const receiptData = {
        receiptNumber,
        date: new Date().toLocaleDateString("en-PK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: new Date().toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        items: cart.items.map((i) => ({
          name: i.nameEn,
          qty: i.quantity,
          unitPrice: i.unitPrice,
          total: i.totalPrice,
        })),
        subtotal,
        discount: discountAmount,
        discountType: cart.discountType,
        total,
        paymentMethod: cart.paymentMethod,
        cashReceived: cart.paymentMethod === "CASH" ? cart.cashReceived : undefined,
        changeGiven: cart.paymentMethod === "CASH" ? change : undefined,
        customerName: cart.customerName,
        isOffline: true,
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
      toast.success(`⚡ Offline sale saved! Rs.${total}`)
      onSuccess(receiptData)
    } catch (err: any) {
      console.error("Offline sale error:", err)
      toast.error("Failed to save offline sale — please try again!")
    }
  }

  const handleComplete = async () => {
    if (!canComplete) {
      if (cart.paymentMethod === "CASH" && cart.cashReceived < total) {
        toast.error("Cash received is less than total")
      }
      return
    }

    setIsProcessing(true)
    const { isOnline } = usePOSConnectionStore.getState()
    if (isOnline) {
      await processOnlineSale()
    } else {
      await processOfflineSale()
    }
    setIsProcessing(false)
  }


  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && !isProcessing && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass border border-pos-border rounded-2xl w-full max-w-[440px] mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-pos-border">
              <h3 className="font-grotesk font-bold text-white text-lg">Payment Confirmation</h3>
              {!isProcessing && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Order Summary */}
            <div className="p-5 space-y-3">
              {/* Items (max 5) */}
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {cart.items.slice(0, 5).map((item) => (
                  <div key={item.productId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 truncate flex-1">{item.nameEn}</span>
                    <span className="text-gray-600 text-xs mx-2">×{item.quantity}</span>
                    <span className="font-mono text-white">Rs.{item.totalPrice}</span>
                  </div>
                ))}
                {cart.items.length > 5 && (
                  <p className="text-gray-600 text-xs text-center pt-1">
                    …and {cart.items.length - 5} more items
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-pos-border" />

              {/* Totals */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-mono">Rs.{subtotal}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-400">
                    <span>Discount</span>
                    <span className="font-mono">-Rs.{discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="font-grotesk font-bold text-white text-lg">TOTAL</span>
                  <span className="font-mono text-2xl font-bold text-teal-400">Rs.{total}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border ${
                  METHOD_COLORS[cart.paymentMethod]
                }`}
              >
                <span className="text-base">{METHOD_LABELS[cart.paymentMethod]}</span>
              </div>

              {/* Cash Change */}
              {cart.paymentMethod === "CASH" && cart.cashReceived >= total && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs">Cash Received: Rs.{cart.cashReceived}</p>
                  <p className="font-mono text-amber-400 font-bold text-2xl mt-0.5">
                    Rs.{change} change
                  </p>
                </div>
              )}

              {/* Cash warning */}
              {cart.paymentMethod === "CASH" && cart.cashReceived < total && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-red-400 text-sm">
                    Cash received (Rs.{cart.cashReceived}) is less than total (Rs.{total})
                  </p>
                </div>
              )}

              {/* Digital confirmation */}
              {isDigital && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={digitalConfirmed}
                    onChange={(e) => setDigitalConfirmed(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className="text-gray-400 text-sm">Payment received from customer</span>
                </label>
              )}

              {/* Complete Button */}
              <motion.button
                whileTap={canComplete ? { scale: 0.98 } : {}}
                onClick={handleComplete}
                disabled={!canComplete}
                className={`
                  w-full h-12 rounded-xl font-grotesk font-bold text-white text-base
                  flex items-center justify-center gap-2
                  transition-all duration-200
                  ${
                    canComplete
                      ? "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 shadow-lg shadow-teal-500/30"
                      : "bg-pos-card border border-pos-border opacity-50 cursor-not-allowed"
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Complete Sale
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
