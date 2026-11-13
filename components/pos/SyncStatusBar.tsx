"use client"

import { usePOSConnectionStore } from "@/stores/pos-connection"

export default function SyncStatusBar() {
  const { isSyncing } = usePOSConnectionStore()
  if (!isSyncing) return null

  return (
    <div className="fixed top-0 left-0 right-0 h-0.75 z-9999 bg-[#1A1A1F] overflow-hidden pointer-events-none">
      <div className="h-full bg-linear-to-r from-teal-500 via-emerald-400 to-teal-300 animate-progress-bar" />
    </div>
  )
}
