"use client"

import { PaymentMethod, usePOSCartStore } from "@/stores/pos-cart"
import { motion } from "framer-motion"

const METHODS: { id: PaymentMethod; label: string; icon: string; color: string }[] = [
  { id: "CASH",      label: "Cash",    icon: "💵", color: "green" },
  { id: "JAZZCASH",  label: "JazzCash",icon: "📱", color: "orange" },
  { id: "EASYPAISA", label: "EasyPaisa",icon: "📲",color: "teal" },
  { id: "IN_STORE",  label: "Store",   icon: "🏪", color: "purple" },
]

const COLOR_MAP: Record<string, string> = {
  green:  "bg-green-500/20 text-green-400 border-green-500/40",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  teal:   "bg-teal-500/20 text-teal-400 border-teal-500/40",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/40",
}

export default function PaymentMethods() {
  const { paymentMethod, setPaymentMethod, setCashReceived, cashReceived, getTotal, getChangeGiven } =
    usePOSCartStore()

  const change = getChangeGiven()
  const total = getTotal()

  const handleCashInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0
    setCashReceived(val)
  }

  // Quick cash buttons
  const quickAmounts = [total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 3)

  return (
    <div className="px-3 pb-3 space-y-2">
      {/* Method buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {METHODS.map((method) => {
          const isActive = paymentMethod === method.id
          return (
            <motion.button
              key={method.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaymentMethod(method.id)}
              className={`
                flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium
                transition-all duration-150
                ${isActive ? COLOR_MAP[method.color] + " border" : "bg-pos-card border-pos-border text-gray-500 hover:text-gray-300"}
              `}
            >
              <span className="text-base leading-none">{method.icon}</span>
              <span className="text-[10px]">{method.label}</span>
            </motion.button>
          )
        })}
      </div>

      {/* Cash Input */}
      {paymentMethod === "CASH" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-1.5"
        >
          {/* Quick amounts */}
          <div className="flex gap-1.5">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setCashReceived(amt)}
                className={`flex-1 h-7 rounded-lg text-xs font-mono border transition-all duration-150 ${
                  cashReceived === amt
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-pos-card border-pos-border text-gray-500 hover:text-white"
                }`}
              >
                Rs.{amt}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs w-14 flex-shrink-0">Cash Rec:</span>
            <input
              type="number"
              value={cashReceived || ""}
              onChange={handleCashInput}
              placeholder={String(total)}
              className="flex-1 h-9 px-3 bg-pos-card border border-pos-border rounded-xl text-sm font-mono text-white placeholder-gray-700 outline-none focus:border-green-500/50"
            />
          </div>

          {cashReceived > 0 && cashReceived >= total && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2"
            >
              <span className="text-amber-400 text-xs">Change:</span>
              <span className="font-mono text-amber-400 font-bold text-base">
                Rs.{change}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Digital payment confirmation */}
      {(paymentMethod === "JAZZCASH" || paymentMethod === "EASYPAISA") && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-xs"
        >
          <p className="text-orange-400">
            Send <span className="font-mono font-bold">Rs.{total}</span> to:
          </p>
          <p className="text-white font-mono font-bold text-sm mt-0.5">
            {paymentMethod === "JAZZCASH" ? "JazzCash: 0300-XXXXXXX" : "EasyPaisa: 0300-XXXXXXX"}
          </p>
        </motion.div>
      )}
    </div>
  )
}
