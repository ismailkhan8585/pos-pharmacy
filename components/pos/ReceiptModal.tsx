"use client"

import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Printer, Share2, CheckCircle } from "lucide-react"
import { generateReceiptHTML } from "@/lib/pos-receipt"

interface Props {
  isOpen: boolean
  receiptData: any
  onClose: () => void
  onNewSale: () => void
}

export default function ReceiptModal({ isOpen, receiptData, onClose, onNewSale }: Props) {
  const printFrameRef = useRef<HTMLIFrameElement>(null)

  if (!receiptData) return null

  const handlePrint = () => {
    const html = generateReceiptHTML(receiptData)
    const printWindow = window.open("", "_blank", "width=400,height=600")
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  const handleWhatsApp = () => {
    const lines = [
      `*${receiptData.settings.storeName}*`,
      `Receipt: ${receiptData.receiptNumber}`,
      `Date: ${receiptData.date} ${receiptData.time}`,
      `─────────────────`,
      ...receiptData.items.map((i: any) => `${i.name} ×${i.qty} = Rs.${i.total}`),
      `─────────────────`,
      `Total: *Rs.${receiptData.total}*`,
      `Payment: ${receiptData.paymentMethod}`,
      receiptData.settings.receiptFooter,
    ]
    const text = encodeURIComponent(lines.join("\n"))
    window.open(`https://wa.me/?text=${text}`, "_blank")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass border border-pos-border rounded-2xl w-full max-w-[380px] mx-4 overflow-hidden"
          >
            {/* Success Header */}
            <div
              className={`flex flex-col items-center pt-6 pb-4 border-b border-pos-border ${
                receiptData.isOffline ? "bg-amber-500/10" : "bg-teal-500/5"
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
              >
                <CheckCircle
                  className={`w-12 h-12 ${
                    receiptData.isOffline ? "text-amber-400" : "text-teal-400"
                  }`}
                />
              </motion.div>
              <h3 className="font-grotesk font-bold text-white text-lg mt-2 flex items-center gap-1.5">
                {receiptData.isOffline ? "⚡ Offline Sale Complete!" : "Sale Complete!"}
              </h3>
              <p className="text-gray-400 font-mono text-xs">{receiptData.receiptNumber}</p>
              {receiptData.isOffline && (
                <span className="mt-1 text-[10px] text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                  Saved locally · Queued for auto-sync
                </span>
              )}
            </div>

            {/* Receipt Preview */}
            <div className="p-4 max-h-[300px] overflow-y-auto">
              <div className="receipt-paper text-[11px] rounded-lg">
                <div className="text-center font-bold text-sm">{receiptData.settings.storeName}</div>
                <div className="text-center">{receiptData.settings.ownerName}</div>
                <div className="text-center">{receiptData.settings.phone}</div>
                <div>{"═".repeat(32)}</div>
                <div>Date: {receiptData.date}</div>
                <div>Time: {receiptData.time}</div>
                <div>Receipt: {receiptData.receiptNumber}</div>
                {receiptData.isOffline && (
                  <div className="text-center font-bold text-amber-700 py-0.5">
                    ** OFFLINE SALE **
                  </div>
                )}
                <div>{"─".repeat(32)}</div>
                {receiptData.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate flex-1 mr-2">{item.name}</span>
                    <span>×{item.qty} Rs.{item.total}</span>
                  </div>
                ))}
                <div>{"─".repeat(32)}</div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs.{receiptData.subtotal}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-Rs.{receiptData.discount}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>Rs.{receiptData.total}</span>
                </div>
                <div>{"─".repeat(32)}</div>
                <div>Payment: {receiptData.paymentMethod}</div>
                {receiptData.cashReceived && <div>Cash: Rs.{receiptData.cashReceived}</div>}
                {receiptData.changeGiven !== undefined && <div>Change: Rs.{receiptData.changeGiven}</div>}
                <div>{"═".repeat(32)}</div>
                <div className="text-center">{receiptData.settings.receiptFooter}</div>
                <div>{"═".repeat(32)}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-pos-border space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-xl text-sm font-medium hover:bg-teal-500/20 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-green-500/10 text-green-400 border border-green-500/30 rounded-xl text-sm font-medium hover:bg-green-500/20 transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>

              <button
                onClick={onNewSale}
                className="w-full h-10 bg-pos-card border border-pos-border rounded-xl text-gray-400 text-sm hover:text-white hover:bg-pos-cardHover transition-all"
              >
                ✓ New Sale
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
