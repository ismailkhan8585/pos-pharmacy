import { create } from "zustand"

interface POSConnectionStore {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  lastSyncAt: Date | null
  setOnline: (v: boolean) => void
  setPendingCount: (v: number) => void
  setIsSyncing: (v: boolean) => void
  setLastSyncAt: (d: Date) => void
}

export const usePOSConnectionStore = create<POSConnectionStore>((set) => ({
  isOnline: typeof window !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  setOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}))
