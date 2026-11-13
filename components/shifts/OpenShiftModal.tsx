"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Loader2, Sunrise, CircleCheck, Circle } from "lucide-react"
import { openShift as openShiftAPI } from "@/lib/supabase"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { Modal, Field, btnPrimary } from "@/components/ui"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
}

const QUICK = [0, 1000, 2000, 5000, 10000]

export default function OpenShiftModal({ isOpen, onClose }: Props) {
  const [openingCash, setOpeningCash] = useState("")
  const [isOpening, setIsOpening] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const openShift = usePOSShiftStore((s) => s.openShift)
  const ownerName = usePOSSettingsStore((s) => s.ownerName)
  const storeName = usePOSSettingsStore((s) => s.storeName)

  const cash = parseFloat(openingCash) || 0

  const handleOpen = async () => {
    if (!confirmed || isOpening) return
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
        toast.success(`Shift ${shift.shift_number} started`)
        setIsOpening(false)
        onClose()
        return
      } catch (err) {
        console.warn("Could not open shift on cloud, falling back to offline:", err)
      }
    }

    // Offline shift fallback
    try {
      const now = new Date()
      const dateCode = now.toISOString().slice(0, 10).replace(/-/g, "")
      const rand = Math.floor(100 + Math.random() * 900)
      const offlineShiftNumber = `SFT-OFF-${dateCode}-${rand}`
      openShift(cash, {
        id: `shift-off-${Date.now()}`,
        shiftNumber: offlineShiftNumber,
        operatorName: ownerName || "Adil Nawaz",
        openedAt: now.toISOString(),
      })
      toast.success(`Shift ${offlineShiftNumber} started (offline)`)
      onClose()
    } catch (offlineErr: any) {
      toast.error("Failed to open shift: " + (offlineErr?.message || "Unknown error"))
    } finally {
      setIsOpening(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={Sunrise}
      title={`${greeting}, ${(ownerName || "there").split(" ")[0]}`}
      subtitle={`Start a new shift at ${storeName}`}
      size="sm"
    >
      <form
        className="p-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          handleOpen()
        }}
      >
        <Field label="Opening cash in drawer">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">Rs</span>
            <input
              type="text"
              inputMode="numeric"
              value={openingCash}
              onChange={(e) => {
                setOpeningCash(e.target.value.replace(/[^0-9]/g, ""))
                setConfirmed(false)
              }}
              placeholder="0"
              autoFocus
              className="w-full h-14 pl-12 pr-4 bg-pos-bg border border-pos-border rounded-2xl text-2xl font-mono font-bold text-white placeholder-gray-600 focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/10 tabular"
            />
          </div>
        </Field>

        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setOpeningCash(String(q))
                setConfirmed(false)
              }}
              className={`h-8 px-3 rounded-lg text-xs font-mono border transition-all ${
                cash === q && openingCash !== ""
                  ? "border-teal-500/50 bg-teal-500/10 text-teal-300"
                  : "border-pos-border bg-pos-card text-gray-400 hover:text-white"
              }`}
            >
              {q.toLocaleString("en-PK")}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setConfirmed((v) => !v)}
          className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left text-sm transition-all ${
            confirmed ? "border-teal-500/50 bg-teal-500/10 text-teal-100" : "border-pos-border bg-pos-card text-gray-300 hover:border-pos-borderHi"
          }`}
        >
          {confirmed ? <CircleCheck className="w-5 h-5 text-teal-300 shrink-0" /> : <Circle className="w-5 h-5 text-gray-500 shrink-0" />}
          <span>
            I've counted the drawer and it holds{" "}
            <span className="font-mono font-semibold text-white">Rs {cash.toLocaleString("en-PK")}</span>
          </span>
        </button>

        <motion.button whileTap={{ scale: 0.98 }} type="submit" disabled={!confirmed || isOpening} className={`${btnPrimary} w-full h-12`}>
          {isOpening ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Starting shift…
            </>
          ) : (
            "Start Shift"
          )}
        </motion.button>

        <button type="button" onClick={onClose} className="w-full text-gray-500 text-xs hover:text-gray-300 transition-colors">
          Skip for now — sell without shift tracking
        </button>
      </form>
    </Modal>
  )
}
