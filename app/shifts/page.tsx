"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { supabase, closeShift } from "@/lib/supabase"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { formatDateTime, formatShiftDuration } from "@/lib/pos-helpers"
import { Clock, Power, Banknote, Smartphone, BadgePercent, ReceiptText, Wallet, CircleDot, Loader2, History, MonitorPlay } from "lucide-react"
import { PageHeader, StatCard, Modal, Field, EmptyState, btnPrimary, btnSecondary } from "@/components/ui"
import toast from "react-hot-toast"

const fmt = (n: number) => Math.round(n || 0).toLocaleString("en-PK")

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingCash, setClosingCash] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const currentShift = usePOSShiftStore((s) => s.currentShift)
  const closeShiftState = usePOSShiftStore((s) => s.closeShift)

  const loadShifts = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("shifts").select("*").order("opened_at", { ascending: false }).limit(100)
      if (!error && data) setShifts(data)
    } catch (err) {
      console.warn("Could not load shifts from cloud:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShifts()
  }, [loadShifts])

  const isOpen = currentShift.status === "OPEN"
  const expectedCash = currentShift.openingCash + (currentShift.cashSales || 0)
  const counted = closingCash === "" ? null : parseFloat(closingCash) || 0
  const cashDiff = counted === null ? 0 : counted - expectedCash

  const handleCloseShift = async () => {
    if (!currentShift.id || counted === null) return
    setIsClosing(true)
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
    const isCloudShift = isOnline && !currentShift.id.startsWith("shift-off-")

    if (isCloudShift) {
      try {
        await closeShift(currentShift.id, {
          closingCash: counted,
          expectedCash,
          cashDifference: cashDiff,
          totalSales: currentShift.totalSales,
          totalBills: currentShift.totalBills,
          totalDiscount: currentShift.totalDiscount,
        })
        closeShiftState()
        toast.success("Shift closed")
        setShowCloseModal(false)
        setClosingCash("")
        setIsClosing(false)
        loadShifts()
        return
      } catch (err) {
        console.warn("Failed to close shift on cloud, closing locally:", err)
      }
    }

    closeShiftState()
    toast.success("Shift closed on this device (offline)")
    setShowCloseModal(false)
    setClosingCash("")
    setIsClosing(false)
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeader icon={Clock} title="Shifts" subtitle="Cash drawer and shift performance" />

      {/* Current shift */}
      {isOpen ? (
        <div className="relative overflow-hidden rounded-3xl border border-teal-500/25 bg-linear-to-br from-teal-500/10 via-pos-card to-pos-card p-6">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30 rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Shift in progress
              </span>
              <h2 className="font-grotesk text-xl font-bold text-white mt-3">{currentShift.operatorName}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                <span className="font-mono">{currentShift.shiftNumber}</span> · started{" "}
                {currentShift.openedAt ? formatDateTime(currentShift.openedAt) : "—"}
                {currentShift.openedAt && <> · {formatShiftDuration(currentShift.openedAt)} ago</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">Sales this shift</p>
              <p className="font-mono text-4xl font-bold text-white tabular">Rs {fmt(currentShift.totalSales)}</p>
            </div>
          </div>

          <div className="relative grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
            <StatCard label="Bills" value={fmt(currentShift.totalBills)} icon={ReceiptText} tone="sky" />
            <StatCard label="Opening cash" value={`Rs ${fmt(currentShift.openingCash)}`} icon={Wallet} tone="gray" />
            <StatCard label="Cash sales" value={`Rs ${fmt(currentShift.cashSales)}`} icon={Banknote} tone="teal" />
            <StatCard label="Digital sales" value={`Rs ${fmt(currentShift.digitalSales)}`} icon={Smartphone} tone="purple" />
            <StatCard label="Discounts" value={`Rs ${fmt(currentShift.totalDiscount)}`} icon={BadgePercent} tone="amber" />
          </div>

          <div className="relative flex flex-wrap items-center justify-between gap-3 mt-6 pt-5 border-t border-white/5">
            <p className="text-sm text-gray-400">
              Expected in drawer: <span className="font-mono font-semibold text-white">Rs {fmt(expectedCash)}</span>
            </p>
            <div className="flex gap-2">
              <Link href="/pos" className={btnSecondary}>
                <MonitorPlay className="w-4 h-4" /> Back to POS
              </Link>
              <button
                onClick={() => setShowCloseModal(true)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 shadow-[0_10px_24px_-10px_rgba(249,115,22,0.8)] transition-all"
              >
                <Power className="w-4 h-4" /> End shift
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl surface p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CircleDot className="w-5 h-5 text-gray-500" />
            <div>
              <p className="text-white font-semibold">No shift is open</p>
              <p className="text-sm text-gray-500">Open the POS counter to start a new shift.</p>
            </div>
          </div>
          <Link href="/pos" className={btnPrimary}>
            <MonitorPlay className="w-4 h-4" /> Go to POS
          </Link>
        </div>
      )}

      {/* Close shift */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => !isClosing && setShowCloseModal(false)}
        icon={Power}
        tone="amber"
        title="End shift"
        subtitle="Count the cash drawer to close out"
        size="sm"
      >
        <div className="p-6 space-y-5">
          <div className="rounded-2xl border border-pos-border bg-pos-bg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Opening cash</span>
              <span className="font-mono text-gray-200">Rs {fmt(currentShift.openingCash)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>+ Cash sales</span>
              <span className="font-mono text-gray-200">Rs {fmt(currentShift.cashSales)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-dashed border-pos-border font-semibold">
              <span className="text-gray-200">Expected in drawer</span>
              <span className="font-mono text-white">Rs {fmt(expectedCash)}</span>
            </div>
          </div>

          <Field label="Cash counted in drawer">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">Rs</span>
              <input
                type="text"
                inputMode="numeric"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value.replace(/[^0-9.]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleCloseShift()}
                placeholder={fmt(expectedCash)}
                className="w-full h-14 pl-12 pr-4 bg-pos-bg border border-pos-border rounded-2xl text-2xl font-mono font-bold text-white placeholder-gray-600 tabular"
                autoFocus
              />
            </div>
          </Field>

          {counted !== null && (
            <div
              className={`flex justify-between items-center rounded-2xl px-4 h-14 border ${
                Math.round(cashDiff) === 0
                  ? "bg-teal-500/10 border-teal-500/25"
                  : cashDiff > 0
                  ? "bg-sky-500/10 border-sky-500/25"
                  : "bg-red-500/10 border-red-500/25"
              }`}
            >
              <span className="text-sm text-gray-300">
                {Math.round(cashDiff) === 0 ? "Drawer balanced" : cashDiff > 0 ? "Over by" : "Short by"}
              </span>
              <span
                className={`font-mono font-bold text-xl ${
                  Math.round(cashDiff) === 0 ? "text-teal-300" : cashDiff > 0 ? "text-sky-300" : "text-red-300"
                }`}
              >
                {Math.round(cashDiff) === 0 ? "✓" : `Rs ${fmt(Math.abs(cashDiff))}`}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowCloseModal(false)} disabled={isClosing} className={`${btnSecondary} flex-1`}>
              Cancel
            </button>
            <button
              onClick={handleCloseShift}
              disabled={isClosing || counted === null}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white bg-orange-500 hover:bg-orange-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              {isClosing ? "Closing…" : "Close shift"}
            </button>
          </div>
        </div>
      </Modal>

      {/* History */}
      <div className="bg-pos-card border border-pos-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-pos-border">
          <History className="w-4 h-4 text-gray-500" />
          <h3 className="font-grotesk font-semibold text-white">Shift history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-5 py-3">Shift</th>
                <th className="text-left px-4 py-3">Opened</th>
                <th className="text-left px-4 py-3">Closed</th>
                <th className="text-right px-4 py-3">Sales</th>
                <th className="text-right px-4 py-3">Bills</th>
                <th className="text-right px-4 py-3">Drawer</th>
                <th className="text-right px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-pos-border/60">
                    <td colSpan={7} className="px-5 py-3">
                      <div className="h-6 rounded-lg bg-white/3 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon={History} title="No shifts recorded yet" description="Closed shifts will appear here with their cash count." />
                  </td>
                </tr>
              ) : (
                shifts.map((s) => {
                  const diff = s.cash_difference
                  return (
                    <tr key={s.id} className="border-t border-pos-border/60">
                      <td className="px-5 py-3">
                        <p className="font-mono text-sm text-white">{s.shift_number}</p>
                        <p className="text-xs text-gray-500">{s.operator_name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(s.opened_at)}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{s.closed_at ? formatDateTime(s.closed_at) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-white text-sm tabular">Rs {fmt(s.total_sales)}</td>
                      <td className="px-4 py-3 text-right text-gray-300 text-sm">{s.total_bills || 0}</td>
                      <td className="px-4 py-3 text-right">
                        {diff != null ? (
                          <span
                            className={`font-mono text-xs px-2 py-1 rounded-lg border ${
                              Math.round(diff) === 0
                                ? "text-teal-300 bg-teal-500/10 border-teal-500/20"
                                : diff > 0
                                ? "text-sky-300 bg-sky-500/10 border-sky-500/20"
                                : "text-red-300 bg-red-500/10 border-red-500/25"
                            }`}
                          >
                            {Math.round(diff) === 0 ? "Balanced" : `${diff > 0 ? "+" : "−"}Rs ${fmt(Math.abs(diff))}`}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 ${
                            s.status === "OPEN" ? "text-teal-300 bg-teal-500/10" : "text-gray-400 bg-white/5"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.status === "OPEN" ? "bg-teal-400" : "bg-gray-500"}`} />
                          {s.status === "OPEN" ? "Open" : "Closed"}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
