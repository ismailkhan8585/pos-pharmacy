"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/ui"
import { Settings as HeaderIcon } from "lucide-react"
import {
  Store,
  Printer,
  CreditCard,
  Sliders,
  ShieldCheck,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Trash2,
} from "lucide-react"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { usePOSConnectionStore } from "@/stores/pos-connection"
import { fetchSettings, saveSettings } from "@/lib/supabase"
import { changePin } from "@/lib/auth"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const store = usePOSSettingsStore()
  const [activeTab, setActiveTab] = useState<
    "store" | "receipt" | "payments" | "inventory" | "security" | "system"
  >("store")

  // Form states initialized from store
  const [formData, setFormData] = useState({
    storeName: store.storeName,
    storeNameUr: store.storeNameUr,
    ownerName: store.ownerName,
    phone: store.phone,
    whatsapp: store.whatsapp,
    address: store.address,
    drugLicense: store.drugLicense,

    receiptFooter: store.receiptFooter,
    receiptFontSize: store.receiptFontSize,
    showDrugLicense: store.showDrugLicense,

    enableCash: store.enableCash,
    enableJazzcash: store.enableJazzcash,
    jazzcashNumber: store.jazzcashNumber,
    enableEasypaisa: store.enableEasypaisa,
    easypaisaNumber: store.easypaisaNumber,
    enableStore: store.enableStore,

    defaultLowStock: store.defaultLowStock,
    expiryWarningDays: store.expiryWarningDays,
    taxEnabled: store.taxEnabled,
    taxRate: store.taxRate,
    currencySymbol: store.currencySymbol,

    autoLockMinutes: store.autoLockMinutes,
  })

  // PIN change state
  const [oldPin, setOldPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [isChangingPin, setIsChangingPin] = useState(false)

  // Loading/Saving states
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Sync store data to form when store loads
    setFormData({
      storeName: store.storeName,
      storeNameUr: store.storeNameUr,
      ownerName: store.ownerName,
      phone: store.phone,
      whatsapp: store.whatsapp,
      address: store.address,
      drugLicense: store.drugLicense,

      receiptFooter: store.receiptFooter,
      receiptFontSize: store.receiptFontSize,
      showDrugLicense: store.showDrugLicense,

      enableCash: store.enableCash,
      enableJazzcash: store.enableJazzcash,
      jazzcashNumber: store.jazzcashNumber,
      enableEasypaisa: store.enableEasypaisa,
      easypaisaNumber: store.easypaisaNumber,
      enableStore: store.enableStore,

      defaultLowStock: store.defaultLowStock,
      expiryWarningDays: store.expiryWarningDays,
      taxEnabled: store.taxEnabled,
      taxRate: store.taxRate,
      currencySymbol: store.currencySymbol,

      autoLockMinutes: store.autoLockMinutes,
    })
  }, [store])

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      // 1. Update zustand store
      store.setSettings({
        storeName: formData.storeName,
        storeNameUr: formData.storeNameUr,
        ownerName: formData.ownerName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        address: formData.address,
        drugLicense: formData.drugLicense,
        receiptFooter: formData.receiptFooter,
        receiptFontSize: formData.receiptFontSize,
        showDrugLicense: formData.showDrugLicense,
        enableCash: formData.enableCash,
        enableJazzcash: formData.enableJazzcash,
        jazzcashNumber: formData.jazzcashNumber,
        enableEasypaisa: formData.enableEasypaisa,
        easypaisaNumber: formData.easypaisaNumber,
        enableStore: formData.enableStore,
        defaultLowStock: Number(formData.defaultLowStock),
        expiryWarningDays: Number(formData.expiryWarningDays),
        taxEnabled: formData.taxEnabled,
        taxRate: Number(formData.taxRate),
        currencySymbol: formData.currencySymbol,
        autoLockMinutes: Number(formData.autoLockMinutes),
      })

      // 2. Persist to Supabase settings key-value table
      await saveSettings({
        store_name: formData.storeName,
        store_name_ur: formData.storeNameUr,
        owner_name: formData.ownerName,
        phone: formData.phone,
        whatsapp: formData.whatsapp,
        address: formData.address,
        drug_license: formData.drugLicense,
        receipt_footer: formData.receiptFooter,
        receipt_font_size: formData.receiptFontSize,
        show_drug_license: formData.showDrugLicense ? "true" : "false",
        enable_cash: formData.enableCash ? "true" : "false",
        enable_jazzcash: formData.enableJazzcash ? "true" : "false",
        jazzcash_number: formData.jazzcashNumber,
        enable_easypaisa: formData.enableEasypaisa ? "true" : "false",
        easypaisa_number: formData.easypaisaNumber,
        enable_store: formData.enableStore ? "true" : "false",
        default_low_stock: String(formData.defaultLowStock),
        expiry_warning_days: String(formData.expiryWarningDays),
        tax_enabled: formData.taxEnabled ? "true" : "false",
        tax_rate: String(formData.taxRate),
        currency_symbol: formData.currencySymbol,
        auto_lock_minutes: String(formData.autoLockMinutes),
      })

      toast.success("Settings saved successfully!")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to save settings to cloud, saved locally")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePinUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPin || !newPin) {
      toast.error("Please enter current and new PIN")
      return
    }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      toast.error("New PIN must be exactly 4 digits")
      return
    }
    if (newPin !== confirmPin) {
      toast.error("New PIN and confirmation do not match")
      return
    }

    setIsChangingPin(true)
    try {
      const res = await changePin(oldPin, newPin)
      if (res.success) {
        toast.success("PIN changed successfully!")
        setOldPin("")
        setNewPin("")
        setConfirmPin("")
      } else {
        toast.error(res.error || "Failed to update PIN")
      }
    } catch (err: any) {
      toast.error(err?.message || "Error changing PIN")
    } finally {
      setIsChangingPin(false)
    }
  }

  const handleClearCache = () => {
    if (confirm("Clear local cache and reload fresh data from database?")) {
      localStorage.removeItem("pos-products-storage")
      toast.success("Cache cleared! Reloading...")
      setTimeout(() => window.location.reload(), 800)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader
        icon={HeaderIcon}
        title="Settings"
        subtitle="Pharmacy profile, receipts, payments, alerts and security"
        actions={
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        }
      />

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-pos-panel border border-pos-border sticky top-0 z-10 backdrop-blur">
        {[
          { id: "store", label: "Pharmacy Profile", icon: Store },
          { id: "receipt", label: "80mm Receipt", icon: Printer },
          { id: "payments", label: "Payment Methods", icon: CreditCard },
          { id: "inventory", label: "Inventory & Alerts", icon: Sliders },
          { id: "security", label: "Security & PIN", icon: ShieldCheck },
          { id: "system", label: "Database & Sync", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 h-10 px-4 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? "bg-pos-cardHover text-white shadow-md shadow-black/30 ring-1 ring-white/5"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-teal-300" : ""}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab 1: Pharmacy Profile */}
      {activeTab === "store" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-pos-panel p-6 rounded-2xl border border-pos-border">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Pharmacy Name (English)
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Pharmacy Name (Urdu / پشتو)
              </label>
              <input
                type="text"
                dir="rtl"
                value={formData.storeNameUr}
                onChange={(e) => setFormData({ ...formData, storeNameUr: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 font-urdu text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Owner / Pharmacist Name
              </label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Drug License Number (KPK Health Dept)
              </label>
              <input
                type="text"
                placeholder="e.g. DL-KPK-12345"
                value={formData.drugLicense}
                onChange={(e) => setFormData({ ...formData, drugLicense: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Phone Number (Counter)
              </label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                WhatsApp Number (Customer Receipts)
              </label>
              <input
                type="text"
                placeholder="0300-1234567"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Pharmacy Address & Location
              </label>
              <textarea
                rows={3}
                placeholder="Main Bazar, Swabi, KPK, Pakistan"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: 80mm Receipt */}
      {activeTab === "receipt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-5">
            <h2 className="text-lg font-bold text-white mb-2">Receipt Configuration</h2>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Footer Greeting & Message
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Printed at the bottom of every 80mm paper roll</p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Receipt Print Font Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setFormData({ ...formData, receiptFontSize: size })}
                    className={`py-2 px-3 rounded-xl border text-sm capitalize font-medium transition-all ${
                      formData.receiptFontSize === size
                        ? "bg-teal-500/20 border-teal-500 text-teal-400"
                        : "bg-pos-card border-pos-border text-gray-400 hover:text-white"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-xl bg-pos-card border border-pos-border">
                <input
                  type="checkbox"
                  checked={formData.showDrugLicense}
                  onChange={(e) => setFormData({ ...formData, showDrugLicense: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-500 bg-pos-bg border-gray-600 focus:ring-0 focus:ring-offset-0"
                />
                <div>
                  <p className="text-sm font-medium text-white">Print Drug License on Receipt</p>
                  <p className="text-xs text-gray-400">Complies with KPK Drug Administration regulations</p>
                </div>
              </label>
            </div>
          </div>

          {/* Thermal Receipt 80mm Live Preview */}
          <div className="lg:col-span-5 bg-pos-panel p-6 rounded-2xl border border-pos-border flex flex-col items-center">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 self-start">
              80mm Paper Preview
            </p>
            <div className="w-75 bg-white text-black p-5 rounded shadow-2xl font-mono text-[11px] leading-relaxed select-none">
              <div className="text-center font-bold text-sm tracking-wide">{formData.storeName || "AN MedCare"}</div>
              <div className="text-center text-[10px] text-gray-600 font-sans">{formData.storeNameUr}</div>
              <div className="text-center text-[10px]">{formData.ownerName || "Adil Nawaz"}</div>
              <div className="text-center text-[10px] text-gray-700">{formData.address || "Swabi, KPK"}</div>
              <div className="text-center text-[10px]">Tel: {formData.phone || "0300-XXXXXXX"}</div>
              {formData.showDrugLicense && formData.drugLicense && (
                <div className="text-center text-[10px] font-semibold text-gray-800">
                  Lic #: {formData.drugLicense}
                </div>
              )}
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Receipt: RCP-20260904-0012</span>
                <span>14:32</span>
              </div>
              <div className="text-[10px] text-gray-600">Cashier: Adil Nawaz</div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>Panadol 500mg (Tab) x 20</span>
                  <span>Rs. 80.00</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Augmentin 625mg (Box) x 1</span>
                  <span>Rs. 320.00</span>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rs. 400.00</span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1 border-t border-gray-300">
                  <span>TOTAL:</span>
                  <span>Rs. 400.00</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Cash Tendered:</span>
                  <span>Rs. 500.00</span>
                </div>
                <div className="flex justify-between text-[10px] font-semibold">
                  <span>Change:</span>
                  <span>Rs. 100.00</span>
                </div>
              </div>
              <div className="border-t border-dashed border-gray-400 my-2"></div>
              <div className="text-center italic text-[10px] text-gray-700">
                {formData.receiptFooter || "Get well soon!"}
              </div>
              <div className="text-center text-[9px] text-gray-500 mt-1">
                Thank you for choosing {formData.storeName || "AN MedCare"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment Methods */}
      {activeTab === "payments" && (
        <div className="bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-6">
          <h2 className="text-lg font-bold text-white mb-2">Accepted Payment Options</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cash */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-semibold text-white text-sm">Cash on Counter</p>
                  <p className="text-xs text-gray-400">Primary Pakistani Rupee cash billing</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableCash}
                  onChange={(e) => setFormData({ ...formData, enableCash: e.target.checked })}
                  className="w-5 h-5 rounded text-teal-500 bg-pos-bg border-gray-600"
                />
              </label>
            </div>

            {/* Store Credit */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-semibold text-white text-sm">Store Credit / Khata (ادھار)</p>
                  <p className="text-xs text-gray-400">Allow trusted customer ledger balance</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableStore}
                  onChange={(e) => setFormData({ ...formData, enableStore: e.target.checked })}
                  className="w-5 h-5 rounded text-teal-500 bg-pos-bg border-gray-600"
                />
              </label>
            </div>

            {/* JazzCash */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-semibold text-white text-sm">JazzCash Mobile Account / Till</p>
                  <p className="text-xs text-gray-400">Accept mobile digital transfers</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableJazzcash}
                  onChange={(e) => setFormData({ ...formData, enableJazzcash: e.target.checked })}
                  className="w-5 h-5 rounded text-teal-500 bg-pos-bg border-gray-600"
                />
              </label>
              {formData.enableJazzcash && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">JazzCash Account / Till #</label>
                  <input
                    type="text"
                    placeholder="0300-1234567 or Till ID"
                    value={formData.jazzcashNumber}
                    onChange={(e) => setFormData({ ...formData, jazzcashNumber: e.target.value })}
                    className="w-full bg-pos-bg border border-pos-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            {/* EasyPaisa */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-semibold text-white text-sm">EasyPaisa Mobile Account / Till</p>
                  <p className="text-xs text-gray-400">Accept EasyPaisa digital payments</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableEasypaisa}
                  onChange={(e) => setFormData({ ...formData, enableEasypaisa: e.target.checked })}
                  className="w-5 h-5 rounded text-teal-500 bg-pos-bg border-gray-600"
                />
              </label>
              {formData.enableEasypaisa && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">EasyPaisa Account / Till #</label>
                  <input
                    type="text"
                    placeholder="0345-1234567 or Till ID"
                    value={formData.easypaisaNumber}
                    onChange={(e) => setFormData({ ...formData, easypaisaNumber: e.target.value })}
                    className="w-full bg-pos-bg border border-pos-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory & Alerts */}
      {activeTab === "inventory" && (
        <div className="bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-6">
          <h2 className="text-lg font-bold text-white mb-2">Thresholds, Units & Tax</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Default Low Stock Alert Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={formData.defaultLowStock}
                  onChange={(e) => setFormData({ ...formData, defaultLowStock: Number(e.target.value) })}
                  className="w-36 bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
                />
                <span className="text-xs text-gray-400">units / packs</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Products falling below this quantity trigger red low stock warnings.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Expiry Alert Notice (Days in advance)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={7}
                  value={formData.expiryWarningDays}
                  onChange={(e) => setFormData({ ...formData, expiryWarningDays: Number(e.target.value) })}
                  className="w-36 bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
                />
                <span className="text-xs text-gray-400">days</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Batches expiring within this number of days will appear in expiry alerts.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-36 bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">Default for Pakistan is Rs.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-pos-card border border-pos-border">
                <input
                  type="checkbox"
                  checked={formData.taxEnabled}
                  onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-500 bg-pos-bg border-gray-600"
                />
                <div>
                  <p className="text-sm font-medium text-white">Enable Sales Tax / GST</p>
                  <p className="text-xs text-gray-400">Calculate tax on each sale automatically</p>
                </div>
              </label>

              {formData.taxEnabled && (
                <div className="flex items-center gap-3 pl-2">
                  <label className="text-xs text-gray-400 font-semibold">Tax Rate (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                    className="w-24 bg-pos-card border border-pos-border rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Security & PIN */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Change PIN */}
          <form
            onSubmit={handlePinUpdate}
            className="bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-4"
          >
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              Change Login PIN
            </h2>
            <p className="text-xs text-gray-400">
              The 4-digit PIN is used to unlock the POS counter and authorize returns.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Current PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white tracking-widest text-center text-lg font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                New 4-Digit PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white tracking-widest text-center text-lg font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Confirm New PIN
              </label>
              <input
                type={showPin ? "text" : "password"}
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white tracking-widest text-center text-lg font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPin ? "Hide PIN" : "Show PIN"}
              </button>

              <button
                type="submit"
                disabled={isChangingPin}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {isChangingPin ? "Updating..." : "Update PIN"}
              </button>
            </div>
          </form>

          {/* Session Lockout & Staff Info */}
          <div className="bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-5">
            <h2 className="text-lg font-bold text-white mb-1">Session Security</h2>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                Auto-Lock Inactivity Period
              </label>
              <select
                value={formData.autoLockMinutes}
                onChange={(e) => setFormData({ ...formData, autoLockMinutes: Number(e.target.value) })}
                className="w-full bg-pos-card border border-pos-border rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500 text-sm"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={120}>2 Hours</option>
                <option value={240}>4 Hours (Shift duration)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Locks screen after counter inactivity to protect data</p>
            </div>

            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Current User</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm">
                  A
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Adil Nawaz</p>
                  <p className="text-xs text-gray-400">Primary Administrator / Owner</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5" /> PIN Lockout Protection
              </p>
              After 5 consecutive incorrect PIN attempts, the counter is locked automatically for 5 minutes.
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Database & System */}
      {activeTab === "system" && (
        <div className="bg-pos-panel p-6 rounded-2xl border border-pos-border space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">Cloud & Offline Storage Sync</h2>
              <p className="text-xs text-gray-400">
                Hybrid synchronization between IndexedDB local browser storage and Supabase cloud.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={async () => {
                  toast("Starting cloud synchronization...", { icon: "🔄" })
                  const { runSync } = await import("@/lib/pos-sync")
                  const result = await runSync()
                  if (result.synced > 0) {
                    toast.success(`✅ ${result.synced} offline sale(s) synced`)
                  }
                  if (result.failed > 0) {
                    toast.error(`⚠️ ${result.failed} sale(s) failed sync`)
                  }
                  if (result.synced === 0 && result.failed === 0) {
                    toast.success("All transactions are synchronized!")
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold shadow-md shadow-teal-500/20 active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supabase Status */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Supabase Cloud</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-white font-mono font-bold">PostgreSQL Cloud</p>
              <p className="text-[11px] text-gray-400">
                Free permanent tier · Realtime auto-backups enabled
              </p>
            </div>

            {/* Offline Cache Status */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">IndexedDB Local DB</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Active
                </span>
              </div>
              <p className="text-xs text-white font-mono font-bold">anmedcare-pos</p>
              <p className="text-[11px] text-gray-400">
                Full catalog, batches & offline receipts preserved locally
              </p>
            </div>

            {/* Sync Queue */}
            <div className="p-4 rounded-xl bg-pos-card border border-pos-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Pending Sync Queue</span>
                <span className="text-[10px] font-mono text-gray-400">Auto-upload</span>
              </div>
              <p className="text-lg text-amber-400 font-mono font-bold">
                Counter Queue Ready
              </p>
              <p className="text-[11px] text-gray-400">
                Auto-sync triggers whenever network reconnects
              </p>
            </div>
          </div>

          {/* Maintenance Actions */}
          <div className="pt-3 border-t border-pos-border space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Cache Maintenance & Diagnostics
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleClearCache}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pos-card border border-pos-border hover:border-red-500/40 text-gray-300 hover:text-red-400 text-xs font-medium transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                Clear Local Offline Cache
              </button>

              <button
                type="button"
                onClick={async () => {
                  toast("Re-fetching product catalog from Supabase...", { icon: "📦" })
                  const { refreshProductsFromCloud } = await import("@/lib/pos-sync")
                  const ok = await refreshProductsFromCloud()
                  if (ok) {
                    toast.success("Product catalog refreshed successfully!")
                  } else {
                    toast.error("Cloud re-fetch failed: verify network connection")
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pos-card border border-pos-border hover:border-teal-500/40 text-gray-300 hover:text-teal-400 text-xs font-medium transition-all"
              >
                <RefreshCw className="w-4 h-4 text-teal-400" />
                Force Cloud Catalog Re-sync
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-pos-card/50 border border-pos-border text-xs text-gray-500 flex flex-col sm:flex-row justify-between gap-2">
            <span>AN MedCare Hybrid POS v1.0.0 (PWA Standalone)</span>
            <span>Swabi, KPK, Pakistan · Pharmacist: Adil Nawaz</span>
          </div>
        </div>
      )}
    </div>
  )
}
