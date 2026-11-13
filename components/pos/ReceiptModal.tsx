"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Printer, MessageCircle, Check, Plus, CloudOff } from "lucide-react"
import { generateReceiptHTML } from "@/lib/pos-receipt"

interface Props {
  isOpen: boolean
  receiptData: any
  onClose: () => void
  onNewSale: () => void
}

const METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
  IN_STORE: "Store Credit",
}

const fmt = (n: number) => Number(n || 0).toLocaleString("en-PK")

export default function ReceiptModal({ isOpen, receiptData, onNewSale }: Props) {
  const handlePrint = () => {
    if (!receiptData) return
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
      ...(receiptData.discount > 0 ? [`Discount: -Rs.${receiptData.discount}`] : []),
      `Total: *Rs.${receiptData.total}*`,
      `Payment: ${METHOD_LABEL[receiptData.paymentMethod] || receiptData.paymentMethod}`,
      receiptData.settings.receiptFooter,
    ]
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank")
  }

  // Enter = new sale, P = print
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault()
        onNewSale()
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  if (!receiptData) return null
  const offline = !!receiptData.isOffline
  const hasChange = receiptData.paymentMethod === "CASH" && receiptData.changeGiven > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="glass border border-pos-borderHi rounded-3xl w-full max-w-105 max-h-[94vh] overflow-hidden flex flex-col"
          >
            {/* Success header */}
            <div className="relative flex flex-col items-center pt-7 pb-5 px-6 border-b border-pos-border overflow-hidden shrink-0">
              <div
                className={`absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl ${
                  offline ? "bg-amber-500/20" : "bg-emerald-500/25"
                }`}
              />
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.05 }}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${
                  offline ? "bg-amber-500 shadow-amber-500/40" : "bg-emerald-500 shadow-emerald-500/40"
                }`}
              >
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </motion.div>
              <h3 className="relative font-grotesk font-bold text-white text-xl mt-3">Sale complete</h3>
              <p className="relative text-gray-400 font-mono text-xs mt-0.5">
                {receiptData.receiptNumber} · {receiptData.time}
              </p>

              <div className="relative mt-4 grid grid-cols-2 gap-2 w-full">
                <div className="rounded-xl bg-pos-bg/70 border border-pos-border px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Total · {METHOD_LABEL[receiptData.paymentMethod]}</p>
                  <p className="font-mono text-lg font-bold text-white tabular">Rs {fmt(receiptData.total)}</p>
                </div>
                <div
                  className={`rounded-xl border px-3 py-2 ${
                    hasChange ? "bg-amber-500/10 border-amber-500/30" : "bg-pos-bg/70 border-pos-border"
                  }`}
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Change due</p>
                  <p className={`font-mono text-lg font-bold tabular ${hasChange ? "text-amber-300" : "text-gray-500"}`}>
                    Rs {fmt(receiptData.changeGiven || 0)}
                  </p>
                </div>
              </div>

              {offline && (
                <span className="relative mt-3 flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-full">
                  <CloudOff className="w-3 h-3" />
                  Saved on this device · will sync automatically
                </span>
              )}
            </div>

            {/* Receipt preview */}
            <div className="p-4 overflow-y-auto bg-pos-bg/40 min-h-0">
              <div className="receipt-paper text-[11px] rounded-lg shadow-lg shadow-black/40">
                <div className="text-center font-bold text-sm">{receiptData.settings.storeName}</div>
                <div className="text-center">{receiptData.settings.ownerName}</div>
                <div className="text-center">{receiptData.settings.phone}</div>
                <div>{"═".repeat(32)}</div>
                <div>Date: {receiptData.date}</div>
                <div>Time: {receiptData.time}</div>
                <div>Receipt: {receiptData.receiptNumber}</div>
                {receiptData.customerName && <div>Customer: {receiptData.customerName}</div>}
                {offline && <div className="text-center font-bold py-0.5">** OFFLINE SALE **</div>}
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
                <div>Payment: {METHOD_LABEL[receiptData.paymentMethod] || receiptData.paymentMethod}</div>
                {receiptData.cashReceived !== undefined && <div>Cash: Rs.{receiptData.cashReceived}</div>}
                {receiptData.changeGiven !== undefined && <div>Change: Rs.{receiptData.changeGiven}</div>}
                <div>{"═".repeat(32)}</div>
                <div className="text-center">{receiptData.settings.receiptFooter}</div>
                <div>{"═".repeat(32)}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-pos-border space-y-2 shrink-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrint}
                  className="h-11 flex items-center justify-center gap-2 bg-pos-card text-gray-200 border border-pos-border rounded-xl text-sm font-medium hover:border-teal-500/40 hover:text-teal-300 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print
                  <span className="kbd">P</span>
                </button>
                <button
                  onClick={handleWhatsApp}
                  className="h-11 flex items-center justify-center gap-2 bg-pos-card text-gray-200 border border-pos-border rounded-xl text-sm font-medium hover:border-green-500/40 hover:text-green-300 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
              <button
                onClick={onNewSale}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-white font-grotesk font-bold bg-linear-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-[0_10px_28px_-8px_rgba(16,185,129,0.6)] transition-all"
              >
                <Plus className="w-5 h-5" />
                New Sale
                <span className="kbd ml-1 bg-white/15! border-white/20! text-white!">Enter</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
