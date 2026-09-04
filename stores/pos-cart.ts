import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CartItem {
  productId: string
  nameEn: string
  nameUr: string | null
  brand: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  requiresPrescription: boolean
  maxStock: number
  unit: string
}

export type PaymentMethod = "CASH" | "JAZZCASH" | "EASYPAISA" | "IN_STORE"
export type DiscountType = "AMOUNT" | "PERCENTAGE"

interface POSCartStore {
  items: CartItem[]
  discount: number
  discountType: DiscountType
  paymentMethod: PaymentMethod
  cashReceived: number
  customerName: string
  customerPhone: string
  notes: string
  billCounter: number

  addItem: (product: any) => "added" | "already_max" | "out_of_stock"
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clearCart: () => void
  setDiscount: (amount: number, type: DiscountType) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setCashReceived: (amount: number) => void
  setCustomer: (name: string, phone: string) => void
  setNotes: (notes: string) => void
  incrementBill: () => void

  getSubtotal: () => number
  getDiscountAmount: () => number
  getTotal: () => number
  getChangeGiven: () => number
  getBillNumber: () => string
  getItemCount: () => number
  getTotalQty: () => number
  hasRxItems: () => boolean
  isEmpty: () => boolean
}

export const usePOSCartStore = create<POSCartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      discountType: "AMOUNT",
      paymentMethod: "CASH",
      cashReceived: 0,
      customerName: "",
      customerPhone: "",
      notes: "",
      billCounter: 1,

      addItem: (product) => {
        const state = get()
        const existing = state.items.find((i) => i.productId === product.id)

        if (product.stock <= 0) return "out_of_stock"

        if (existing) {
          if (existing.quantity >= existing.maxStock) return "already_max"
          set({
            items: state.items.map((i) =>
              i.productId === product.id
                ? {
                    ...i,
                    quantity: i.quantity + 1,
                    totalPrice: (i.quantity + 1) * i.unitPrice,
                  }
                : i
            ),
          })
          return "added"
        }

        set({
          items: [
            ...state.items,
            {
              productId: product.id,
              nameEn: product.nameEn,
              nameUr: product.nameUr || null,
              brand: product.brand || null,
              quantity: 1,
              unitPrice: product.sellPrice,
              totalPrice: product.sellPrice,
              requiresPrescription: product.requiresPrescription,
              maxStock: product.stock,
              unit: product.unit || "pcs",
            },
          ],
        })
        return "added"
      },

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => i.productId !== productId) }
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? {
                    ...i,
                    quantity: Math.min(qty, i.maxStock),
                    totalPrice: Math.min(qty, i.maxStock) * i.unitPrice,
                  }
                : i
            ),
          }
        }),

      clearCart: () =>
        set({
          items: [],
          discount: 0,
          discountType: "AMOUNT",
          paymentMethod: "CASH",
          cashReceived: 0,
          customerName: "",
          customerPhone: "",
          notes: "",
        }),

      setDiscount: (discount, discountType) => set({ discount, discountType }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setCashReceived: (cashReceived) => set({ cashReceived }),
      setCustomer: (customerName, customerPhone) => set({ customerName, customerPhone }),
      setNotes: (notes) => set({ notes }),
      incrementBill: () => set((s) => ({ billCounter: s.billCounter + 1 })),

      getSubtotal: () => get().items.reduce((s, i) => s + i.totalPrice, 0),

      getDiscountAmount: () => {
        const { discount, discountType } = get()
        const sub = get().getSubtotal()
        if (discountType === "PERCENTAGE") {
          return Math.round((sub * Math.min(discount, 100)) / 100)
        }
        return Math.min(discount, sub)
      },

      getTotal: () => Math.max(0, get().getSubtotal() - get().getDiscountAmount()),

      getChangeGiven: () => Math.max(0, get().cashReceived - get().getTotal()),

      getBillNumber: () => `#B-${String(get().billCounter).padStart(4, "0")}`,

      getItemCount: () => get().items.length,

      getTotalQty: () => get().items.reduce((s, i) => s + i.quantity, 0),

      hasRxItems: () => get().items.some((i) => i.requiresPrescription),

      isEmpty: () => get().items.length === 0,
    }),
    {
      name: "pos-cart-storage",
    }
  )
)
