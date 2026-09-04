"use client"

import { useEffect, useState } from "react"
import { supabase, closeShift } from "@/lib/supabase"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { formatDateTime, formatShiftDuration } from "@/lib/pos-helpers"
import { Clock, CheckCircle, XCircle } from "lucide-react"
import toast from "react-hot-toast"

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingCash, setClosingCash] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const { currentShift, closeShift: closeShiftState } = usePOSShiftStore()

  useEffect(() => {
    const loadShifts = async () => {
      try {
        const { data, error } = await supabase
          .from("shifts")
          .select("*")
          .order("opened_at", { ascending: false })
        if (!error && data) {
          setShifts(data)
        }
      } catch (err) {
        console.warn("Could not load shifts from cloud:", err)
      } finally {
        setIsLoading(false)
      }
    }
    loadShifts()
  }, [])

  const handleCloseShift = async () => {
    if (!currentShift.id) return
    const cash = parseFloat(closingCash) || 0
    const expectedCash = currentShift.openingCash + (currentShift.cashSales || 0)
    const difference = cash - expectedCash

    setIsClosing(true)
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true
    const isCloudShift = isOnline && !currentShift.id.startsWith("shift-off-")

    if (isCloudShift) {
      try {
        await closeShift(currentShift.id, {
          closingCash: cash,
          expectedCash,
          cashDifference: difference,
          totalSales: currentShift.totalSales,
          totalBills: currentShift.totalBills,
          totalDiscount: currentShift.totalDiscount,
        })
        closeShiftState()
        toast.success("Shift closed successfully")
        setShowCloseModal(false)

        // Refresh cloud shifts
        try {
          const { data } = await supabase
            .from("shifts")
            .select("*")
            .order("opened_at", { ascending: false })
          if (data) setShifts(data)
        } catch {}
        return
      } catch (err: any) {
        console.warn("Failed to close shift on cloud, closing locally:", err)
      } finally {
        setIsClosing(false)
      }
    }

    // Offline shift close
    try {
      closeShiftState()
      toast.success("⚡ Shift closed in offline mode", { icon: "🟡" })
      setShowCloseModal(false)
    } catch (offlineErr: any) {
      toast.error("Failed to close shift: " + offlineErr?.message)
    } finally {
      setIsClosing(false)
    }
  }

  const expectedCash = currentShift.openingCash + (currentShift.cashSales || 0)
  const cashDiff = parseFloat(closingCash) - expectedCash

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-grotesk font-bold text-2xl text-white">Shifts</h1>
        <p className="text-gray-500 text-sm">Track daily shift performance</p>
      </div>

      {/* Current Shift Card */}
      {currentShift.status === "OPEN" && (
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-teal-400" />
                <span className="text-teal-400 font-medium">Shift Active</span>
                <span className="font-mono text-gray-500 text-sm">{currentShift.shiftNumber}</span>
              </div>
              <p className="text-gray-500 text-sm">Started: {currentShift.openedAt ? formatDateTime(currentShift.openedAt) : "—"}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-white">Rs.{Math.round(currentShift.totalSales).toLocaleString()}</p>
              <p className="text-gray-500 text-sm">{currentShift.totalBills} bills</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-teal-500/20">
            <div>
              <p className="text-gray-500 text-xs">Opening Cash</p>
              <p className="font-mono text-white font-bold">Rs.{currentShift.openingCash}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Cash Sales</p>
              <p className="font-mono text-teal-400 font-bold">Rs.{Math.round(currentShift.cashSales || 0)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Discount Given</p>
              <p className="font-mono text-amber-400 font-bold">Rs.{Math.round(currentShift.totalDiscount)}</p>
            </div>
          </div>

          <button
            onClick={() => setShowCloseModal(true)}
            className="mt-4 w-full h-10 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-xl text-sm font-medium hover:bg-orange-500/20 transition-all"
          >
            End Shift
          </button>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="glass border border-pos-border rounded-2xl w-full max-w-sm mx-4 p-5 space-y-4">
            <h3 className="font-grotesk font-bold text-white text-lg">Close Shift</h3>

            <div className="space-y-2 bg-pos-card border border-pos-border rounded-xl p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Opening Cash:</span>
                <span className="font-mono text-white">Rs.{currentShift.openingCash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cash Sales:</span>
                <span className="font-mono text-teal-400">Rs.{Math.round(currentShift.cashSales || 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-pos-border pt-2">
                <span className="text-gray-400">Expected in Drawer:</span>
                <span className="font-mono text-white">Rs.{Math.round(expectedCash)}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Actual Cash in Drawer (Rs.)</label>
              <input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder={String(Math.round(expectedCash))}
                className="w-full h-12 px-4 bg-pos-bg border border-pos-border rounded-xl text-2xl font-mono text-white outline-none focus:border-orange-500/50"
                autoFocus
              />
            </div>

            {closingCash && (
              <div className={`flex justify-between items-center rounded-xl px-4 py-3 ${
                cashDiff >= 0 ? "bg-teal-500/10 border border-teal-500/20" : "bg-red-500/10 border border-red-500/20"
              }`}>
                <span className="text-gray-400 text-sm">Difference:</span>
                <span className={`font-mono font-bold text-lg ${cashDiff >= 0 ? "text-teal-400" : "text-red-400"}`}>
                  {cashDiff >= 0 ? "+" : ""}Rs.{Math.round(cashDiff)}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 h-10 bg-pos-card border border-pos-border rounded-xl text-gray-400 text-sm hover:text-white transition-all">
                Cancel
              </button>
              <button
                onClick={handleCloseShift}
                disabled={isClosing}
                className="flex-1 h-10 bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-xl text-sm font-medium hover:bg-orange-500/20 transition-all disabled:opacity-50"
              >
                {isClosing ? "Closing…" : "Close Shift"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History */}
      <div className="bg-pos-card border border-pos-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-pos-border">
          <h3 className="font-grotesk font-semibold text-white text-sm">Shift History</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-border">
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Shift #</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Opened</th>
              <th className="text-left px-4 py-3 text-gray-500 text-xs">Closed</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs">Sales</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Bills</th>
              <th className="text-right px-4 py-3 text-gray-500 text-xs">Cash Diff</th>
              <th className="text-center px-4 py-3 text-gray-500 text-xs">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-600">Loading…</td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-600">No shifts yet</td></tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="border-b border-pos-border/50 hover:bg-pos-cardHover/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-teal-400 text-sm">{s.shift_number}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(s.opened_at)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{s.closed_at ? formatDateTime(s.closed_at) : "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-white text-sm">Rs.{Math.round(s.total_sales || 0)}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-sm">{s.total_bills || 0}</td>
                  <td className="px-4 py-3 text-right">
                    {s.cash_difference != null ? (
                      <span className={`font-mono text-sm ${s.cash_difference >= 0 ? "text-teal-400" : "text-red-400"}`}>
                        {s.cash_difference >= 0 ? "+" : ""}Rs.{Math.round(s.cash_difference)}
                      </span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`flex items-center justify-center gap-1 text-xs ${s.status === "OPEN" ? "text-teal-400" : "text-gray-500"}`}>
                      {s.status === "OPEN" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
