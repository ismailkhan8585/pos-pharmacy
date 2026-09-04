import { openDB, IDBPDatabase } from "idb"

const DB_NAME = "anmedcare-pos"
const DB_VERSION = 1

export interface LocalProduct {
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
  isActive: boolean
  batches: Array<{
    id: string
    batchNumber: string | null
    quantity: number
    expiryDate: string | null
  }>
  syncedAt: number
}

export interface PendingSale {
  offlineSaleId: string // UUID (local unique ID)
  receiptNumber: string // RCP-OFF-YYYYMMDD-XXXX
  items: Array<{
    productId: string
    productName: string
    productNameUr: string | null
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  discount: number
  discountType: "AMOUNT" | "PERCENTAGE"
  totalAmount: number
  paymentMethod: string
  cashReceived: number | null
  changeGiven: number | null
  customerName: string | null
  customerPhone: string | null
  notes: string | null
  shiftId: string | null
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED"
  createdAt: number // timestamp ms
  syncedAt: number | null
  syncError: string | null
  retryCount: number
}

export interface LocalHeldBill {
  id: string
  billNumber: string
  customerName: string | null
  note: string | null
  items: Array<{
    productId: string
    nameEn: string
    nameUr: string | null
    quantity: number
    unitPrice: number
    maxStock: number
  }>
  subtotal: number
  discount: number
  discountType: string
  createdAt: number
  expiresAt: number
}

let dbInstance: IDBPDatabase | null = null

export async function getLocalDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only accessible in browser client runtime")
  }
  if (dbInstance) return dbInstance
  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store
      if (!db.objectStoreNames.contains("products")) {
        const products = db.createObjectStore("products", { keyPath: "id" })
        products.createIndex("barcode", "barcode")
        products.createIndex("categoryId", "categoryId")
        products.createIndex("stock", "stock")
      }

      // Pending sales store
      if (!db.objectStoreNames.contains("pendingSales")) {
        const pending = db.createObjectStore("pendingSales", {
          keyPath: "offlineSaleId",
        })
        pending.createIndex("status", "status")
        pending.createIndex("createdAt", "createdAt")
      }

      // Held bills store
      if (!db.objectStoreNames.contains("heldBills")) {
        db.createObjectStore("heldBills", { keyPath: "id" })
      }

      // Settings store
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" })
      }

      // Receipt counter store
      if (!db.objectStoreNames.contains("counters")) {
        db.createObjectStore("counters", { keyPath: "key" })
      }

      // Stock ledger (offline actions)
      if (!db.objectStoreNames.contains("offlineLedger")) {
        const ledger = db.createObjectStore("offlineLedger", {
          keyPath: "id",
          autoIncrement: true,
        })
        ledger.createIndex("productId", "productId")
      }
    },
  })
  return dbInstance
}

// ─── PRODUCTS ─────────────────────────────────────

export async function syncProductsToLocal(products: LocalProduct[]) {
  const db = await getLocalDB()
  const tx = db.transaction("products", "readwrite")
  for (const p of products) {
    await tx.store.put({ ...p, syncedAt: Date.now() })
  }
  await tx.done
  await saveCounter("products_synced_at", Date.now())
}

export async function getLocalProducts(): Promise<LocalProduct[]> {
  const db = await getLocalDB()
  return db.getAll("products")
}

export async function getLocalProduct(
  id: string
): Promise<LocalProduct | undefined> {
  const db = await getLocalDB()
  return db.get("products", id)
}

export async function findByBarcode(
  barcode: string
): Promise<LocalProduct | undefined> {
  const db = await getLocalDB()
  const tx = db.transaction("products")
  const idx = tx.store.index("barcode")
  return idx.get(barcode)
}

export async function deductLocalStock(
  productId: string,
  quantity: number,
  saleRef: string
): Promise<number> {
  const db = await getLocalDB()
  const tx = db.transaction(["products", "offlineLedger"], "readwrite")
  const product = await tx.objectStore("products").get(productId)
  if (!product) throw new Error("Product not found locally")

  const newStock = Math.max(0, product.stock - quantity)
  await tx.objectStore("products").put({
    ...product,
    stock: newStock,
  })

  await tx.objectStore("offlineLedger").add({
    productId,
    productName: product.nameEn,
    actionType: "OFFLINE_SALE",
    quantity: -quantity,
    balanceAfter: newStock,
    referenceId: saleRef,
    createdAt: Date.now(),
  })

  await tx.done
  return newStock
}

export async function restoreLocalStock(
  productId: string,
  quantity: number,
  returnRef: string
): Promise<number> {
  const db = await getLocalDB()
  const tx = db.transaction(["products", "offlineLedger"], "readwrite")
  const product = await tx.objectStore("products").get(productId)
  if (!product) return 0

  const newStock = product.stock + quantity
  await tx.objectStore("products").put({
    ...product,
    stock: newStock,
  })

  await tx.objectStore("offlineLedger").add({
    productId,
    productName: product.nameEn,
    actionType: "OFFLINE_RETURN",
    quantity: quantity,
    balanceAfter: newStock,
    referenceId: returnRef,
    createdAt: Date.now(),
  })

  await tx.done
  return newStock
}

export async function updateLocalProductStock(
  productId: string,
  newStock: number
) {
  const db = await getLocalDB()
  const product = await db.get("products", productId)
  if (product) {
    await db.put("products", { ...product, stock: newStock })
  }
}

// ─── PENDING SALES ──────────────────────────────

export async function savePendingSale(sale: PendingSale) {
  const db = await getLocalDB()
  await db.put("pendingSales", sale)
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getLocalDB()
  const all = (await db.getAll("pendingSales")) as PendingSale[]
  return all.filter(
    (s) => s.status === "PENDING" || s.status === "FAILED"
  )
}

export async function getAllPendingSales(): Promise<PendingSale[]> {
  const db = await getLocalDB()
  return db.getAll("pendingSales")
}

export async function updateSaleStatus(
  offlineSaleId: string,
  status: PendingSale["status"],
  syncedAt?: number,
  error?: string
) {
  const db = await getLocalDB()
  const sale = (await db.get("pendingSales", offlineSaleId)) as PendingSale | undefined
  if (sale) {
    await db.put("pendingSales", {
      ...sale,
      status,
      syncedAt: syncedAt || null,
      syncError: error || null,
      retryCount:
        status === "FAILED" ? (sale.retryCount || 0) + 1 : sale.retryCount,
    })
  }
}

export async function cleanupSyncedSales(daysOld = 7): Promise<number> {
  const db = await getLocalDB()
  const all = (await db.getAll("pendingSales")) as PendingSale[]
  const cutoff = Date.now() - daysOld * 86400000
  let deleted = 0
  for (const sale of all) {
    if (sale.status === "SYNCED" && sale.syncedAt && sale.syncedAt < cutoff) {
      await db.delete("pendingSales", sale.offlineSaleId)
      deleted++
    }
  }
  return deleted
}

// ─── RECEIPT COUNTER ────────────────────────────

export async function getNextOfflineReceiptNumber(): Promise<string> {
  const db = await getLocalDB()
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const key = `receipt_counter_${today}`
  const counter = await db.get("counters", key)
  const next = (counter?.value || 0) + 1
  await db.put("counters", { key, value: next })
  return `RCP-OFF-${today}-${String(next).padStart(4, "0")}`
}

// ─── HELD BILLS ─────────────────────────────────

export async function saveLocalHeldBill(bill: LocalHeldBill) {
  const db = await getLocalDB()
  await db.put("heldBills", bill)
}

export async function getLocalHeldBills(): Promise<LocalHeldBill[]> {
  const db = await getLocalDB()
  const all = (await db.getAll("heldBills")) as LocalHeldBill[]
  const now = Date.now()
  return all.filter((b) => b.expiresAt > now)
}

export async function deleteLocalHeldBill(id: string) {
  const db = await getLocalDB()
  await db.delete("heldBills", id)
}

// ─── SETTINGS ───────────────────────────────────

export async function saveLocalSetting(key: string, value: any) {
  const db = await getLocalDB()
  await db.put("settings", { key, value, updatedAt: Date.now() })
}

export async function getLocalSetting(key: string) {
  const db = await getLocalDB()
  const item = await db.get("settings", key)
  return item?.value
}

export async function saveAllSettings(settings: Record<string, any>) {
  const db = await getLocalDB()
  const tx = db.transaction("settings", "readwrite")
  for (const [key, value] of Object.entries(settings)) {
    await tx.store.put({ key, value, updatedAt: Date.now() })
  }
  await tx.done
}

// ─── COUNTERS ────────────────────────────────────

export async function saveCounter(key: string, value: any) {
  const db = await getLocalDB()
  await db.put("counters", { key, value })
}

export async function getLocalDB_Stats() {
  const db = await getLocalDB()
  const [products, sales, held] = await Promise.all([
    db.count("products"),
    db.count("pendingSales"),
    db.count("heldBills"),
  ])
  const allSales = (await db.getAll("pendingSales")) as PendingSale[]
  const pending = allSales.filter((s) => s.status === "PENDING").length
  return { products, totalSales: sales, held, pending }
}
