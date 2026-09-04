// Receipt generation for 80mm thermal printer
// Width: ~32 characters for 80mm paper at default font

export interface ReceiptSettings {
  storeName: string
  storeNameUr?: string
  ownerName: string
  phone: string
  address: string
  drugLicense: string
  receiptFooter: string
  currencySymbol: string
}

export interface ReceiptItem {
  name: string
  qty: number
  unitPrice: number
  total: number
}

export interface ReceiptData {
  receiptNumber: string
  date: string
  time: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  discountType?: "AMOUNT" | "PERCENTAGE"
  total: number
  paymentMethod: string
  cashReceived?: number
  changeGiven?: number
  customerName?: string
  isOffline?: boolean
  settings: ReceiptSettings
}

const W = 32

function pad(str: string, width: number, align: "left" | "right" = "left"): string {
  const s = String(str)
  if (s.length >= width) return s.substring(0, width)
  return align === "left" ? s.padEnd(width) : s.padStart(width)
}

function center(text: string): string {
  const t = String(text).substring(0, W)
  const totalPad = W - t.length
  const leftPad = Math.floor(totalPad / 2)
  return " ".repeat(leftPad) + t + " ".repeat(totalPad - leftPad)
}

function line(char = "─"): string {
  return char.repeat(W)
}

function twoCol(left: string, right: string): string {
  const r = String(right)
  const maxLeft = W - r.length - 1
  const l = String(left).substring(0, maxLeft).padEnd(maxLeft)
  return `${l} ${r}`
}

export function generateReceiptText(data: ReceiptData): string {
  const sym = data.settings.currencySymbol || "Rs."
  const formatMoney = (n: number) => `${sym}${n.toFixed(0)}`

  const lines: string[] = [
    line("═"),
    center(data.settings.storeName),
    center(data.settings.ownerName),
    center(data.settings.address),
    center(`Tel: ${data.settings.phone}`),
    line("═"),
    `Date: ${data.date}    Time: ${data.time}`,
    `Receipt: ${data.receiptNumber}`,
  ]

  if (data.customerName) {
    lines.push(`Customer: ${data.customerName}`)
  }

  if (data.isOffline) {
    lines.push("** OFFLINE SALE **")
  }

  lines.push(line())

  // Items
  for (const item of data.items) {
    const nameMaxLen = W - 10
    const name = item.name.substring(0, nameMaxLen).padEnd(nameMaxLen)
    const qtyStr = `x${item.qty}`
    const totalStr = formatMoney(item.total).padStart(8)

    // Line 1: name + total
    lines.push(`${name.substring(0, W - 9)} ${totalStr}`)

    // Line 2: unit price x qty
    const unitInfo = `  ${formatMoney(item.unitPrice)} x ${item.qty}`
    lines.push(unitInfo)
  }

  lines.push(line())

  // Totals
  lines.push(twoCol("Subtotal:", formatMoney(data.subtotal)))

  if (data.discount > 0) {
    lines.push(twoCol("Discount:", `-${formatMoney(data.discount)}`))
  }

  lines.push(twoCol("TOTAL:", formatMoney(data.total)))
  lines.push(line())

  // Payment
  lines.push(twoCol("Payment:", data.paymentMethod))

  if (data.paymentMethod === "CASH") {
    if (data.cashReceived) {
      lines.push(twoCol("Cash:", formatMoney(data.cashReceived)))
    }
    if (data.changeGiven !== undefined) {
      lines.push(twoCol("Change:", formatMoney(data.changeGiven)))
    }
  }

  lines.push(line("═"))

  if (data.settings.drugLicense) {
    lines.push(`License: ${data.settings.drugLicense}`)
  }

  if (data.settings.receiptFooter) {
    lines.push(center(data.settings.receiptFooter))
  }

  lines.push(center("Thank you! Come again"))
  lines.push(line("═"))
  lines.push("")

  return lines.join("\n")
}

// HTML receipt for printing (formatted for 80mm)
export function generateReceiptHTML(data: ReceiptData): string {
  const sym = data.settings.currencySymbol || "Rs."
  const formatMoney = (n: number) => `${sym}${n.toFixed(0)}`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 4mm;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 14px; }
    .xlarge { font-size: 16px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-solid { border-top: 2px solid #000; margin: 4px 0; }
    .row { display: flex; justify-content: space-between; }
    .item-row { margin: 2px 0; }
    .item-name { font-size: 11px; }
    .item-detail { font-size: 10px; color: #444; padding-left: 4px; }
    .total-row { font-size: 14px; font-weight: bold; }
    .footer { margin-top: 8px; font-size: 10px; text-align: center; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="center bold xlarge">${data.settings.storeName}</div>
  <div class="center">${data.settings.ownerName}</div>
  <div class="center">${data.settings.address}</div>
  <div class="center">Tel: ${data.settings.phone}</div>
  <div class="divider-solid"></div>
  <div class="row"><span>Date: ${data.date}</span><span>${data.time}</span></div>
  <div>Receipt: <strong>${data.receiptNumber}</strong></div>
  ${data.customerName ? `<div>Customer: ${data.customerName}</div>` : ""}
  ${data.isOffline ? `<div class="center bold">** OFFLINE SALE **</div>` : ""}
  <div class="divider"></div>
  ${data.items
    .map(
      (item) => `
    <div class="item-row">
      <div class="row item-name">
        <span>${item.name}</span>
        <span>${formatMoney(item.total)}</span>
      </div>
      <div class="item-detail">${formatMoney(item.unitPrice)} × ${item.qty}</div>
    </div>`
    )
    .join("")}
  <div class="divider"></div>
  <div class="row"><span>Subtotal:</span><span>${formatMoney(data.subtotal)}</span></div>
  ${data.discount > 0 ? `<div class="row"><span>Discount:</span><span>-${formatMoney(data.discount)}</span></div>` : ""}
  <div class="divider-solid"></div>
  <div class="row total-row"><span>TOTAL:</span><span>${formatMoney(data.total)}</span></div>
  <div class="divider"></div>
  <div class="row"><span>Payment:</span><span>${data.paymentMethod}</span></div>
  ${data.cashReceived ? `<div class="row"><span>Cash:</span><span>${formatMoney(data.cashReceived)}</span></div>` : ""}
  ${data.changeGiven !== undefined ? `<div class="row"><span>Change:</span><span>${formatMoney(data.changeGiven)}</span></div>` : ""}
  <div class="divider-solid"></div>
  ${data.settings.drugLicense ? `<div class="footer">License: ${data.settings.drugLicense}</div>` : ""}
  <div class="footer">${data.settings.receiptFooter || "Get well soon!"}</div>
  <div class="footer">Thank you for choosing ${data.settings.storeName}</div>
  <br><br>
</body>
</html>`
}
