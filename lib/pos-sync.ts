import {
  getPendingSales,
  updateSaleStatus,
  cleanupSyncedSales,
  getLocalDB_Stats,
  syncProductsToLocal,
  LocalProduct,
} from "./pos-db-local"
import { supabase } from "./supabase"
import { usePOSConnectionStore } from "@/stores/pos-connection"
import { usePOSProductsStore } from "@/stores/pos-products"

export interface SyncResult {
  attempted: number
  synced: number
  failed: number
  errors: string[]
}

let isSyncRunning = false

export async function runSync(): Promise<SyncResult> {
  if (isSyncRunning) {
    return { attempted: 0, synced: 0, failed: 0, errors: [] }
  }

  isSyncRunning = true
  const store = usePOSConnectionStore.getState()
  store.setIsSyncing(true)

  const result: SyncResult = {
    attempted: 0,
    synced: 0,
    failed: 0,
    errors: [],
  }

  try {
    const pending = await getPendingSales()
    result.attempted = pending.length

    for (const sale of pending) {
      // Skip if failed too many times (> 5 retries)
      if ((sale.retryCount || 0) >= 5) {
        result.failed++
        continue
      }

      await updateSaleStatus(sale.offlineSaleId, "SYNCING")

      try {
        // Check for duplicate (idempotency)
        const { data: existing } = await supabase
          .from("sales")
          .select("id")
          .eq("offline_sale_id", sale.offlineSaleId)
          .single()

        if (existing) {
          // Already synced (maybe previous sync crashed after insert before local update)
          await updateSaleStatus(sale.offlineSaleId, "SYNCED", Date.now())
          result.synced++
          continue
        }

        // Upload to Supabase
        const { data: newSale, error: saleError } = await supabase
          .from("sales")
          .insert({
            receipt_number: sale.receiptNumber,
            subtotal: sale.subtotal,
            discount: sale.discount,
            discount_type: sale.discountType,
            total_amount: sale.totalAmount,
            payment_method: sale.paymentMethod,
            cash_received: sale.cashReceived,
            change_given: sale.changeGiven,
            customer_name: sale.customerName,
            customer_phone: sale.customerPhone,
            notes: sale.notes,
            shift_id: sale.shiftId,
            sale_source: "OFFLINE",
            offline_sale_id: sale.offlineSaleId,
            synced_at: new Date().toISOString(),
            created_at: new Date(sale.createdAt).toISOString(),
          })
          .select()
          .single()

        if (saleError) throw saleError

        // Upload sale items
        const { error: itemsError } = await supabase
          .from("sale_items")
          .insert(
            sale.items.map((item) => ({
              sale_id: newSale.id,
              product_id: item.productId,
              product_name: item.productName,
              product_name_ur: item.productNameUr,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total_price: item.totalPrice,
            }))
          )
        if (itemsError) throw itemsError

        // Update stock in Supabase (best effort via RPC)
        for (const item of sale.items) {
          try {
            await supabase.rpc("deduct_stock", {
              p_product_id: item.productId,
              p_quantity: item.quantity,
              p_sale_id: newSale.id,
              p_receipt: sale.receiptNumber,
            })
          } catch (rpcErr) {
            console.warn("Stock deduct RPC warning during sync:", rpcErr)
          }
        }

        await updateSaleStatus(sale.offlineSaleId, "SYNCED", Date.now())
        result.synced++
      } catch (error: any) {
        const errMsg = error?.message || "Unknown sync error"
        await updateSaleStatus(sale.offlineSaleId, "FAILED", undefined, errMsg)
        result.failed++
        result.errors.push(`${sale.receiptNumber}: ${errMsg}`)
      }
    }

    // Update pending count in store
    const stats = await getLocalDB_Stats()
    store.setPendingCount(stats.pending)
    store.setLastSyncAt(new Date())

    // Cleanup old synced sales (older than 7 days)
    await cleanupSyncedSales(7)
  } catch (err: any) {
    console.error("Critical sync run error:", err)
  } finally {
    isSyncRunning = false
    store.setIsSyncing(false)
  }

  return result
}

export async function refreshProductsFromCloud(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name_en, name_ur, brand, barcode, sku,
        sell_price, cost_price, stock, low_stock_at,
        unit, requires_prescription, is_active,
        category_id,
        categories(id, name_en, name_ur, icon),
        product_batches(id, batch_number, quantity, cost_price, expiry_date)
      `)
      .eq("is_active", true)
      .order("name_en")

    if (error || !data) return false

    const products: LocalProduct[] = data.map((p: any) => ({
      id: p.id,
      nameEn: p.name_en,
      nameUr: p.name_ur || null,
      brand: p.brand || null,
      barcode: p.barcode || null,
      sku: p.sku || null,
      sellPrice: parseFloat(p.sell_price || "0"),
      costPrice: parseFloat(p.cost_price || "0"),
      stock: parseFloat(p.stock || "0"),
      lowStockAt: p.low_stock_at || 10,
      unit: p.unit || "pcs",
      requiresPrescription: Boolean(p.requires_prescription),
      isActive: Boolean(p.is_active),
      categoryId: p.category_id || null,
      categoryName: p.categories?.name_en || null,
      categoryIcon: p.categories?.icon || null,
      batches: (p.product_batches || []).map((b: any) => ({
        id: b.id,
        batchNumber: b.batch_number,
        quantity: parseFloat(b.quantity || "0"),
        expiryDate: b.expiry_date,
      })),
      syncedAt: Date.now(),
    }))

    await syncProductsToLocal(products)

    // Update Zustand store
    usePOSProductsStore.getState().setProducts(
      products.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameUr: p.nameUr,
        brand: p.brand,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        categoryIcon: p.categoryIcon,
        barcode: p.barcode,
        sku: p.sku,
        sellPrice: p.sellPrice,
        costPrice: p.costPrice,
        stock: p.stock,
        lowStockAt: p.lowStockAt,
        unit: p.unit,
        requiresPrescription: p.requiresPrescription,
        batches: p.batches,
      }))
    )

    return true
  } catch (err) {
    console.error("Failed to refresh products from cloud:", err)
    return false
  }
}
