import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ShiftData {
  id: string | null
  shiftNumber: string | null
  operatorName: string
  openingCash: number
  status: "OPEN" | "CLOSED" | null
  openedAt: string | null
  totalSales: number
  totalBills: number
  totalDiscount: number
  cashSales: number
  digitalSales: number
}

interface POSShiftStore {
  currentShift: ShiftData
  setShift: (shift: Partial<ShiftData>) => void
  openShift: (openingCash: number, shiftData: any) => void
  closeShift: () => void
  addSaleToShift: (amount: number, discount: number, paymentMethod: string) => void
  clearShift: () => void
}

const DEFAULT_SHIFT: ShiftData = {
  id: null,
  shiftNumber: null,
  operatorName: "Adil Nawaz",
  openingCash: 0,
  status: null,
  openedAt: null,
  totalSales: 0,
  totalBills: 0,
  totalDiscount: 0,
  cashSales: 0,
  digitalSales: 0,
}

export const usePOSShiftStore = create<POSShiftStore>()(
  persist(
    (set) => ({
      currentShift: DEFAULT_SHIFT,

      setShift: (shift) =>
        set((s) => ({ currentShift: { ...s.currentShift, ...shift } })),

      openShift: (openingCash, shiftData) =>
        set({
          currentShift: {
            ...shiftData,
            openingCash,
            status: "OPEN",
            totalSales: 0,
            totalBills: 0,
            totalDiscount: 0,
            cashSales: 0,
            digitalSales: 0,
          },
        }),

      closeShift: () =>
        set((s) => ({
          currentShift: { ...s.currentShift, status: "CLOSED" },
        })),

      addSaleToShift: (amount, discount, paymentMethod) =>
        set((s) => ({
          currentShift: {
            ...s.currentShift,
            totalSales: s.currentShift.totalSales + amount,
            totalBills: s.currentShift.totalBills + 1,
            totalDiscount: s.currentShift.totalDiscount + discount,
            cashSales:
              paymentMethod === "CASH"
                ? s.currentShift.cashSales + amount
                : s.currentShift.cashSales,
            digitalSales:
              paymentMethod !== "CASH"
                ? s.currentShift.digitalSales + amount
                : s.currentShift.digitalSales,
          },
        })),

      clearShift: () => set({ currentShift: DEFAULT_SHIFT }),
    }),
    { name: "pos-shift-storage" }
  )
)
