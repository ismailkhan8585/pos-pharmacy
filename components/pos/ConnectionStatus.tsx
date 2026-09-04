"use client"

import { usePOSConnectionStore } from "@/stores/pos-connection"
import toast from "react-hot-toast"

export default function ConnectionStatus() {
  const { isOnline, pendingCount, isSyncing } = usePOSConnectionStore()

  const manualSync = async () => {
    if (!navigator.onLine) {
      toast.error("Cannot sync: counter is offline")
      return
    }
    toast("Syncing offline sales with Supabase...", { icon: "🔄" })
    const { runSync } = await import("@/lib/pos-sync")
    const result = await runSync()
    if (result.synced > 0) {
      toast.success(`✅ ${result.synced} sale(s) synced`)
    }
    if (result.failed > 0) {
      toast.error(`⚠️ ${result.failed} sale(s) failed sync`)
    }
    if (result.synced === 0 && result.failed === 0) {
      toast.success("All offline sales are up to date!")
    }
  }

  return (
    <div className="flex items-center gap-2">
      {pendingCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={manualSync}
          className="flex items-center gap-1.5 text-amber-400 text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer shadow-sm shadow-amber-500/10"
          title="Click to manually sync offline sales to cloud"
        >
          <span>🔄</span>
          <span className="font-semibold">{pendingCount} offline</span>
        </button>
      )}

      {isSyncing && (
        <span className="flex items-center gap-1.5 text-blue-400 text-[11px] font-mono bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-full">
          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Syncing...</span>
        </span>
      )}

      <span
        className={`flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all ${
          isOnline
            ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            : "text-amber-400 bg-amber-500/10 border-amber-500/20"
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
          }`}
        />
        <span className="font-medium">{isOnline ? "Online" : "Offline"}</span>
      </span>
    </div>
  )
}
export { ConnectionStatus }
