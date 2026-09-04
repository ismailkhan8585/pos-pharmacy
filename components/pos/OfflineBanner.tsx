"use client"

import { usePOSConnectionStore } from "@/stores/pos-connection"

export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing } = usePOSConnectionStore()

  if (isOnline && pendingCount === 0 && !isSyncing) return null

  return (
    <div
      className={`w-full px-4 py-2 text-[12px] flex items-center justify-between border-b transition-all duration-200 z-10 ${
        !isOnline
          ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
          : "bg-blue-500/10 border-blue-500/20 text-blue-300"
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 font-semibold">Offline Mode Active</span>
            <span className="text-gray-400 hidden sm:inline">
              — Sales saved locally in browser · 80mm printing works normally
            </span>
          </>
        ) : (
          <>
            <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400 font-medium">
              Syncing {pendingCount} offline sale(s) to Supabase...
            </span>
          </>
        )}
      </div>

      {!isOnline && pendingCount > 0 && (
        <span className="text-amber-400/90 font-mono text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
          {pendingCount} pending sync
        </span>
      )}
    </div>
  )
}
