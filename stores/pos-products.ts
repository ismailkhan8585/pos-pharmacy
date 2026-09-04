import { create } from "zustand"

export interface POSProduct {
  id: string
  nameEn: string
  nameUr: string | null
  brand: string | null
  categoryId: string | null
  categoryName: string | null
  categoryIcon: string | null
  barcode: string | null
  sku: string | null
  sellPrice: number
  costPrice: number
  stock: number
  lowStockAt: number
  unit: string
  requiresPrescription: boolean
  batches: Array<{
    id: string
    batchNumber: string | null
    quantity: number
    expiryDate: string | null
  }>
}

export interface Category {
  id: string
  nameEn: string
  nameUr: string | null
  icon: string | null
}

interface POSProductsStore {
  products: POSProduct[]
  categories: Category[]
  isLoading: boolean
  isReady: boolean
  searchQuery: string
  activeCategoryId: string | null
  setProducts: (products: POSProduct[]) => void
  setCategories: (cats: Category[]) => void
  setLoading: (v: boolean) => void
  setReady: (v: boolean) => void
  setSearch: (q: string) => void
  setCategory: (id: string | null) => void
  updateProductStock: (productId: string, newStock: number) => void
  getFilteredProducts: () => POSProduct[]
  getLowStockProducts: () => POSProduct[]
  getOutOfStockProducts: () => POSProduct[]
  getExpiringProducts: (days?: number) => POSProduct[]
  getProductByBarcode: (barcode: string) => POSProduct | null
}

export const usePOSProductsStore = create<POSProductsStore>((set, get) => ({
  products: [],
  categories: [],
  isLoading: true,
  isReady: false,
  searchQuery: "",
  activeCategoryId: null,

  setProducts: (products) => set({ products, isLoading: false, isReady: true }),
  setCategories: (categories) => set({ categories }),
  setLoading: (isLoading) => set({ isLoading }),
  setReady: (isReady) => set({ isReady }),
  setSearch: (searchQuery) => set({ searchQuery }),
  setCategory: (activeCategoryId) => set({ activeCategoryId }),

  updateProductStock: (productId, newStock) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, stock: newStock } : p
      ),
    })),

  getFilteredProducts: () => {
    const { products, searchQuery, activeCategoryId } = get()
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        p.nameEn.toLowerCase().includes(q) ||
        (p.nameUr || "").includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.barcode || "").includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      const matchCat = !activeCategoryId || p.categoryId === activeCategoryId
      return matchSearch && matchCat
    })
  },

  getLowStockProducts: () =>
    get().products.filter((p) => p.stock > 0 && p.stock <= p.lowStockAt),

  getOutOfStockProducts: () => get().products.filter((p) => p.stock <= 0),

  getExpiringProducts: (days = 30) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)
    return get().products.filter((p) =>
      p.batches.some((b) => {
        if (!b.expiryDate) return false
        return new Date(b.expiryDate) <= cutoff
      })
    )
  },

  getProductByBarcode: (barcode) =>
    get().products.find((p) => p.barcode === barcode) || null,
}))
