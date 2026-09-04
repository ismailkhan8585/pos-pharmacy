// POS utility helpers

import { format, formatDistance } from "date-fns"

// Format money in PKR
export function formatMoney(amount: number, symbol = "Rs."): string {
  return `${symbol}${amount.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Format money compact (for product tiles)
export function formatMoneyCompact(amount: number): string {
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`
  }
  return amount.toFixed(0)
}

// Format date
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "dd MMM yyyy")
}

// Format time
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "hh:mm a")
}

// Format datetime
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, "dd MMM yyyy, hh:mm a")
}

// Format relative time
export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return formatDistance(d, new Date(), { addSuffix: true })
}

// Format shift duration
export function formatShiftDuration(openedAt: string): string {
  const opened = new Date(openedAt)
  const now = new Date()
  const diffMs = now.getTime() - opened.getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

// Get stock status
export function getStockStatus(stock: number, lowStockAt: number): "ok" | "low" | "out" {
  if (stock <= 0) return "out"
  if (stock <= lowStockAt) return "low"
  return "ok"
}

// Get stock color classes
export function getStockColorClass(status: "ok" | "low" | "out"): string {
  switch (status) {
    case "ok":  return "text-gray-600"
    case "low": return "text-amber-400"
    case "out": return "text-red-400"
  }
}

// Get stock strip color
export function getStockStripClass(status: "ok" | "low" | "out"): string {
  switch (status) {
    case "ok":  return "bg-teal-500"
    case "low": return "bg-amber-500"
    case "out": return "bg-red-500"
  }
}

// Debounce
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Truncate text
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "…"
}

// Get days until expiry
export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// Get expiry status
export function getExpiryStatus(expiryDate: string | null): "expired" | "soon" | "ok" | "none" {
  if (!expiryDate) return "none"
  const days = getDaysUntilExpiry(expiryDate)
  if (days < 0) return "expired"
  if (days <= 30) return "soon"
  return "ok"
}

// KPK cities for dropdowns
export const KPK_CITIES = [
  "Swabi", "Peshawar", "Mardan", "Nowshera", "Charsadda",
  "Abbottabad", "Mansehra", "Haripur", "Kohat", "Bannu",
  "Dera Ismail Khan", "Mingora", "Buner", "Malakand",
  "Hangu", "Karak", "Lakki Marwat", "Tank", "Batkhela",
  "Timergara",
]

// Payment method display
export const PAYMENT_METHODS = {
  CASH: { label: "Cash", icon: "💵", color: "green" },
  JAZZCASH: { label: "JazzCash", icon: "📱", color: "orange" },
  EASYPAISA: { label: "EasyPaisa", icon: "📱", color: "emerald" },
  IN_STORE: { label: "Store Credit", icon: "🏪", color: "purple" },
} as const

// Units for products
export const PRODUCT_UNITS = ["pcs", "strip", "bottle", "box", "sachet", "tube", "vial", "ampoule", "tablet", "capsule", "ml", "gm", "kg"]

// Generate random barcode (EAN-13 format)
export function generateBarcode(): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10))
  // Calculate check digit
  const checkDigit = digits.reduce((sum, d, i) => {
    return sum + (i % 2 === 0 ? d : d * 3)
  }, 0)
  const check = (10 - (checkDigit % 10)) % 10
  return [...digits, check].join("")
}

// Calculate profit margin
export function calculateMargin(sellPrice: number, costPrice: number): number {
  if (costPrice === 0) return 0
  return ((sellPrice - costPrice) / sellPrice) * 100
}

// Format percentage
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Round to nearest Rs.
export function roundMoney(amount: number): number {
  return Math.round(amount)
}

// Get date range
export function getDateRange(preset: "today" | "yesterday" | "week" | "month"): { from: string; to: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (preset) {
    case "today":
      return {
        from: today.toISOString(),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      }
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      return {
        from: yesterday.toISOString(),
        to: new Date(today.getTime() - 1).toISOString(),
      }
    }
    case "week": {
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return {
        from: weekStart.toISOString(),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      }
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        from: monthStart.toISOString(),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      }
    }
  }
}
