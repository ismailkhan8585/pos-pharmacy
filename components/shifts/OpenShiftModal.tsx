"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, DollarSign, Loader2 } from "lucide-react"
import { openShift as openShiftAPI } from "@/lib/supabase"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function OpenShiftModal({ isOpen, onClose }: Props) {
  const [openingCash, setOpeningCash] = useState("")
  const [isOpening, setIsOpening] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const { openShift } = usePOSShiftStore()
  const { ownerName } = usePOSSettingsStore()

  const handleOpen = async () => {
    const cash = parseFloat(openingCash) || 0
    setIsOpening(true)

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true

    if (isOnline) {
      try {
        const shift = await openShiftAPI(cash, ownerName)
        openShift(cash, {
          id: shift.id,
          shiftNumber: shift.shift_number,
          operatorName: shift.operator_name,
          openedAt: shift.opened_at,
        })
        toast.success(`Shift ${shift.shift_number} opened with Rs.${cash}`)
        onClose()
        return
      } catch (err) {
        console.warn("Could not open shift on cloud, falling back to offline:", err)
      } finally {
        setIsOpening(false)
      }
    }

    // Offline Shift Fallback
    try {
      const now = new Date()
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, "")
      const rand = Math.floor(100 + Math.random() * 900)
      const offlineShiftNumber = `SFT-OFF-${dateCode}-${rand}`
      const offlineShiftId = `shift-off-${Date.now()}`

      openShift(cash, {
        id: offlineShiftId,
        shiftNumber: offlineShiftNumber,
        operatorName: ownerName || "Adil Nawaz",
        openedAt: now.toISOString(),
      })
      toast.success(`⚡ Shift ${offlineShiftNumber} opened (Offline Mode)`, { icon: "🟡" })
      onClose()
    } catch (offlineErr: any) {
      toast.error("Failed to open shift: " + (offlineErr?.message || "Unknown error"))
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass border border-pos-border rounded-2xl w-full max-w-sm mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-col items-center pt-6 pb-4 border-b border-pos-border px-4 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3"
                style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))" }}
              >
                ✚
              </div>
              <h3 className="font-grotesk font-bold text-white text-lg">Start New Shift</h3>
              <p className="text-gray-500 text-sm mt-1">AN MedCare POS — {ownerName}</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1.5">
                  Opening Cash Amount (Rs.)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 pl-9 pr-4 bg-pos-card border border-pos-border rounded-xl text-lg font-mono text-white placeholder-gray-700 outline-none focus:border-teal-500/50"
                    autoFocus
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-500"
                />
                <span className="text-gray-400 text-sm leading-relaxed">
                  I have counted and verified the opening cash of{" "}
                  <span className="text-teal-400 font-mono">
                    Rs.{parseFloat(openingCash) || 0}
                  </span>
                </span>
              </label>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleOpen}
                disabled={!confirmed || isOpening}
                className={`
                  w-full h-12 rounded-xl font-grotesk font-bold text-white flex items-center justify-center gap-2 transition-all
                  ${confirmed && !isOpening
                    ? "bg-gradient-to-r from-teal-500 to-teal-600 shadow-lg shadow-teal-500/30 hover:from-teal-400"
                    : "bg-pos-card border border-pos-border opacity-50 cursor-not-allowed"
                  }
                `}
              >
                {isOpening ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Opening Shift…</>
                ) : (
                  "Open Shift"
                )}
              </motion.button>

              <button
                onClick={onClose}
                className="w-full text-gray-600 text-sm hover:text-gray-400 transition-colors py-1"
              >
                Skip (work without shift tracking)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
