"use client"

import { CloudOff, Loader2 } from "lucide-react"
import { usePOSConnectionStore } from "@/stores/pos-connection"

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = usePOSConnectionStore()

  if (isOnline && !isSyncing) return null

  return (
    <div
      className={`w-full px-4 h-9 text-xs flex items-center justify-between border-b shrink-0 z-10 ${
        !isOnline
          ? "bg-linear-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/20"
          : "bg-linear-to-r from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/20"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <>
            <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-300 font-semibold">Offline mode</span>
            <span className="text-gray-400 truncate hidden sm:inline">
              — keep selling. Sales are saved on this device and sync automatically when you're back online.
            </span>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <span className="text-blue-300 font-medium">
              Syncing {pendingCount} offline sale{pendingCount === 1 ? "" : "s"} to the cloud…
            </span>
          </>
        )}
      </div>

      {!isOnline && pendingCount > 0 && (
        <span className="text-amber-300 font-mono text-[11px] bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md shrink-0">
          {pendingCount} waiting to sync
        </span>
      )}
    </div>
  )
}
