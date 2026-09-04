import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper: get all active products for POS
export async function fetchAllProducts() {
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

  if (error) throw error
  return data
}

// Helper: get all settings as key-value object
export async function fetchSettings() {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
  if (error) throw error
  return Object.fromEntries(data.map((s: any) => [s.key, s.value]))
}

// Helper: save settings key-value object
export async function saveSettings(settingsObj: Record<string, any>) {
  const updates = Object.entries(settingsObj).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }))
  const { error } = await supabase.from("settings").upsert(updates, { onConflict: "key" })
  if (error) throw error
  return true
}

// Helper: get categories
export async function fetchCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_en, name_ur, icon")
    .eq("is_active", true)
    .order("sort_order")
  if (error) throw error
  return data
}

// Helper: create a sale
export async function createSale(saleData: any) {
  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      receipt_number: saleData.receiptNumber,
      subtotal: saleData.subtotal,
      discount: saleData.discount,
      discount_type: saleData.discountType,
      total_amount: saleData.total,
      payment_method: saleData.paymentMethod,
      cash_received: saleData.cashReceived,
      change_given: saleData.changeGiven,
      customer_name: saleData.customerName || null,
      customer_phone: saleData.customerPhone || null,
      notes: saleData.notes || null,
      shift_id: saleData.shiftId || null,
      sale_source: "POS",
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (saleError) throw saleError

  // Insert sale items
  const items = saleData.items.map((item: any) => ({
    sale_id: sale.id,
    product_id: item.productId,
    product_name: item.nameEn,
    product_name_ur: item.nameUr || null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }))

  const { error: itemsError } = await supabase.from("sale_items").insert(items)
  if (itemsError) throw itemsError

  // Deduct stock for each item
  for (const item of saleData.items) {
    const { error: stockError } = await supabase.rpc("deduct_stock", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
      p_sale_id: sale.id,
      p_receipt: saleData.receiptNumber,
    })
    if (stockError) throw stockError
  }

  return sale
}

// Helper: generate receipt number
export async function generateReceiptNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const prefix = `RCP-${dateStr}`

  const { count } = await supabase
    .from("sales")
    .select("*", { count: "exact", head: true })
    .like("receipt_number", `${prefix}%`)

  const next = (count || 0) + 1
  return `${prefix}-${String(next).padStart(4, "0")}`
}

// Helper: get sales for date range
export async function fetchSales(from: string, to: string) {
  const { data, error } = await supabase
    .from("sales")
    .select(`
      id, receipt_number, subtotal, discount, total_amount,
      payment_method, customer_name, is_returned, sale_source,
      created_at,
      sale_items(id, product_name, quantity, unit_price, total_price)
    `)
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

// Helper: process return
export async function processReturn(returnData: any) {
  // Generate return receipt number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const prefix = `RTN-${dateStr}`

  const { count } = await supabase
    .from("returns")
    .select("*", { count: "exact", head: true })
    .like("return_receipt", `${prefix}%`)

  const returnReceiptNum = `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`

  // Create return record
  const { data: returnRecord, error: returnError } = await supabase
    .from("returns")
    .insert({
      return_receipt: returnReceiptNum,
      original_sale_id: returnData.originalSaleId,
      reason: returnData.reason,
      refund_amount: returnData.refundAmount,
      refund_method: returnData.refundMethod,
      notes: returnData.notes || null,
    })
    .select()
    .single()

  if (returnError) throw returnError

  // Insert return items
  const returnItems = returnData.items.map((item: any) => ({
    return_id: returnRecord.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  }))

  const { error: itemsError } = await supabase.from("return_items").insert(returnItems)
  if (itemsError) throw itemsError

  // Restore stock for each item
  for (const item of returnData.items) {
    await supabase.rpc("restore_stock", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
      p_return_receipt: returnReceiptNum,
    })
  }

  // Mark original sale as returned
  await supabase
    .from("sales")
    .update({ is_returned: true })
    .eq("id", returnData.originalSaleId)

  return returnRecord
}

// Helper: open a shift
export async function openShift(openingCash: number, operatorName: string) {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "")
  const { count } = await supabase
    .from("shifts")
    .select("*", { count: "exact", head: true })
    .like("shift_number", `SHF-${dateStr}%`)

  const shiftNumber = `SHF-${dateStr}-${String((count || 0) + 1).padStart(3, "0")}`

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      shift_number: shiftNumber,
      operator_name: operatorName,
      opening_cash: openingCash,
      status: "OPEN",
      opened_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: close shift
export async function closeShift(shiftId: string, closingData: any) {
  const { data, error } = await supabase
    .from("shifts")
    .update({
      closing_cash: closingData.closingCash,
      expected_cash: closingData.expectedCash,
      cash_difference: closingData.cashDifference,
      total_sales: closingData.totalSales,
      total_bills: closingData.totalBills,
      total_discount: closingData.totalDiscount,
      status: "CLOSED",
      closed_at: new Date().toISOString(),
    })
    .eq("id", shiftId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper: receive stock
export async function receiveStock(purchaseData: any) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const prefix = `PUR-${dateStr}`
  const { count } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .like("purchase_number", `${prefix}%`)

  const purchaseNumber = `${prefix}-${String((count || 0) + 1).padStart(4, "0")}`

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      purchase_number: purchaseNumber,
      supplier_id: purchaseData.supplierId || null,
      supplier_name: purchaseData.supplierName,
      total_amount: purchaseData.totalAmount,
      payment_method: purchaseData.paymentMethod,
      payment_status: purchaseData.paymentStatus,
      notes: purchaseData.notes || null,
    })
    .select()
    .single()

  if (purchaseError) throw purchaseError

  const purchaseItems = purchaseData.items.map((item: any) => ({
    purchase_id: purchase.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    cost_price: item.costPrice,
    total_price: item.totalPrice,
    batch_number: item.batchNumber || null,
    expiry_date: item.expiryDate || null,
  }))

  const { error: itemsError } = await supabase.from("purchase_items").insert(purchaseItems)
  if (itemsError) throw itemsError

  // Add stock for each item
  for (const item of purchaseData.items) {
    await supabase.rpc("add_stock", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
      p_purchase_number: purchaseNumber,
      p_cost_price: item.costPrice,
    })

    // Add batch record
    if (item.batchNumber || item.expiryDate) {
      await supabase.from("product_batches").insert({
        product_id: item.productId,
        batch_number: item.batchNumber || null,
        quantity: item.quantity,
        cost_price: item.costPrice,
        expiry_date: item.expiryDate || null,
      })
    }
  }

  return purchase
}
