"use client"

import { RefreshCw, Loader2 } from "lucide-react"
import { usePOSConnectionStore } from "@/stores/pos-connection"
import toast from "react-hot-toast"

export default function ConnectionStatus() {
  const { isOnline, pendingCount, isSyncing } = usePOSConnectionStore()

  const manualSync = async () => {
    if (!navigator.onLine) {
      toast.error("Cannot sync: counter is offline")
      return
    }
    const id = toast.loading("Syncing offline sales…")
    const { runSync } = await import("@/lib/pos-sync")
    const result = await runSync()
    toast.dismiss(id)
    if (result.synced > 0) toast.success(`${result.synced} sale(s) synced`)
    if (result.failed > 0) toast.error(`${result.failed} sale(s) failed to sync`)
    if (result.synced === 0 && result.failed === 0) toast.success("Everything is up to date")
  }

  return (
    <div className="flex items-center h-7 rounded-full border border-pos-border bg-pos-card text-[11px] overflow-hidden">
      <span
        className={`flex items-center gap-1.5 h-full px-3 font-medium ${
          isOnline ? "text-emerald-400" : "text-amber-400"
        }`}
      >
        <span className="relative flex w-2 h-2">
          {!isOnline && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 animate-ping" />
          )}
          <span
            className={`relative inline-flex w-2 h-2 rounded-full ${
              isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
            }`}
          />
        </span>
        {isOnline ? "Online" : "Offline"}
      </span>

      {isSyncing && (
        <span className="flex items-center gap-1.5 h-full px-3 border-l border-pos-border text-blue-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          Syncing
        </span>
      )}

      {pendingCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={manualSync}
          className="flex items-center gap-1.5 h-full px-3 border-l border-pos-border text-amber-300 hover:bg-amber-500/10 transition-colors"
          title="Sync offline sales to cloud now"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="font-mono font-semibold">{pendingCount}</span> pending
        </button>
      )}
    </div>
  )
}
export { ConnectionStatus }
