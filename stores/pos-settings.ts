import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface POSSettingsData {
  storeName: string
  storeNameUr: string
  ownerName: string
  phone: string
  whatsapp: string
  address: string
  drugLicense: string
  jazzcashNumber: string
  easypaisaNumber: string
  receiptFooter: string
  taxEnabled: boolean
  taxRate: number
  currencySymbol: string
  defaultLowStock: number
  expiryWarningDays: number
  autoLockMinutes: number
  enableCash: boolean
  enableJazzcash: boolean
  enableEasypaisa: boolean
  enableStore: boolean
  showDrugLicense: boolean
  receiptFontSize: "small" | "medium" | "large"
  isLoaded: boolean
}

interface POSSettingsStore extends POSSettingsData {
  setSettings: (settings: Partial<POSSettingsData>) => void
  loadSettings: (raw: Record<string, string>) => void
}

export const usePOSSettingsStore = create<POSSettingsStore>()(
  persist(
    (set) => ({
      storeName: "AN MedCare",
      storeNameUr: "اے این میڈ کیئر",
      ownerName: "Adil Nawaz",
      phone: "0300-0000000",
      whatsapp: "0300-0000000",
      address: "Swabi, KPK, Pakistan",
      drugLicense: "",
      jazzcashNumber: "",
      easypaisaNumber: "",
      receiptFooter: "Get well soon! Thank you for choosing AN MedCare",
      taxEnabled: false,
      taxRate: 0,
      currencySymbol: "Rs.",
      defaultLowStock: 10,
      expiryWarningDays: 30,
      autoLockMinutes: 240,
      enableCash: true,
      enableJazzcash: true,
      enableEasypaisa: true,
      enableStore: true,
      showDrugLicense: true,
      receiptFontSize: "medium",
      isLoaded: false,

      setSettings: (settings) => set(settings),

      loadSettings: (raw) =>
        set({
          storeName: raw.store_name || "AN MedCare",
          storeNameUr: raw.store_name_ur || "اے این میڈ کیئر",
          ownerName: raw.owner_name || "Adil Nawaz",
          phone: raw.phone || "",
          whatsapp: raw.whatsapp || "",
          address: raw.address || "Swabi, KPK",
          drugLicense: raw.drug_license || "",
          jazzcashNumber: raw.jazzcash_number || "",
          easypaisaNumber: raw.easypaisa_number || "",
          receiptFooter: raw.receipt_footer || "Get well soon!",
          taxEnabled: raw.tax_enabled === "true",
          taxRate: parseFloat(raw.tax_rate || "0"),
          currencySymbol: raw.currency_symbol || "Rs.",
          defaultLowStock: parseInt(raw.default_low_stock || "10"),
          isLoaded: true,
        }),
    }),
    { name: "pos-settings-storage" }
  )
)
