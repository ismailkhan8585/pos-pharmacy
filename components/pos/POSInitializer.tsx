"use client"

import { useState, useEffect, useCallback, ReactNode } from "react"
import { usePOSConnectionStore } from "@/stores/pos-connection"
import { usePOSProductsStore } from "@/stores/pos-products"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { fetchSettings } from "@/lib/supabase"
import POSLoadingScreen from "./POSLoadingScreen"
import POSNoDataScreen from "./POSNoDataScreen"
import toast from "react-hot-toast"

export default function POSInitializer({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<
    "loading" | "ready" | "offline-ready" | "no-data"
  >("loading")
  const [isRetrying, setIsRetrying] = useState(false)

  const loadLocalProducts = useCallback((products: any[]) => {
    const { setCategories, setProducts } = usePOSProductsStore.getState()
    setProducts(
      products.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameUr: p.nameUr || null,
        brand: p.brand || null,
        categoryId: p.categoryId || null,
        categoryName: p.categoryName || null,
        categoryIcon: p.categoryIcon || null,
        barcode: p.barcode || null,
        sku: p.sku || null,
        sellPrice: p.sellPrice || 0,
        costPrice: p.costPrice || 0,
        stock: p.stock || 0,
        lowStockAt: p.lowStockAt || 10,
        unit: p.unit || "pcs",
        requiresPrescription: Boolean(p.requiresPrescription),
        batches: p.batches || [],
      }))
    )

    // Extract categories
    const cats = Array.from(
      new Map(
        products
          .filter((p) => p.categoryId)
          .map((p) => [
            p.categoryId,
            {
              id: p.categoryId,
              nameEn: p.categoryName || "Other",
              nameUr: null,
              icon: p.categoryIcon || null,
            },
          ])
      ).values()
    )
    setCategories(cats)
  }, [])

  const initializePOS = useCallback(async () => {
    const online = typeof navigator !== "undefined" ? navigator.onLine : true
    const { setOnline, setPendingCount } = usePOSConnectionStore.getState()
    setOnline(online)

    const {
      getLocalProducts,
      getLocalDB_Stats,
      cleanupSyncedSales,
      saveAllSettings,
      syncProductsToLocal,
    } = await import("@/lib/pos-db-local")

    let localProducts = await getLocalProducts()

    // If local database is empty, seed with initial pharmacy catalog immediately
    if (localProducts.length === 0) {
      try {
        const { INITIAL_PRODUCTS } = await import("@/lib/initial-catalog")
        await syncProductsToLocal(INITIAL_PRODUCTS)
        localProducts = await getLocalProducts()
      } catch (seedErr) {
        console.warn("Could not seed initial catalog:", seedErr)
      }
    }

    if (online) {
      try {
        const { refreshProductsFromCloud } = await import("@/lib/pos-sync")
        const success = await refreshProductsFromCloud()

        if (success) {
          setStatus("ready")
        } else if (localProducts.length > 0) {
          loadLocalProducts(localProducts)
          setStatus("offline-ready")
        } else {
          setStatus("offline-ready")
        }

        // Fetch & cache settings
        try {
          const settings = await fetchSettings()
          if (settings) {
            await saveAllSettings(settings)
            usePOSSettingsStore.getState().loadSettings(settings)
          }
        } catch {
          // Keep cached settings
        }

        // Check & sync pending offline sales
        const stats = await getLocalDB_Stats()
        setPendingCount(stats.pending)
        if (stats.pending > 0) {
          const { runSync } = await import("@/lib/pos-sync")
          runSync().then((result) => {
            if (result.synced > 0) {
              toast.success(`✅ ${result.synced} offline sale(s) synced`)
            }
          }).catch(() => {})
        }
      } catch (err) {
        console.warn("Cloud init warning, using local DB:", err)
        if (localProducts.length > 0) {
          loadLocalProducts(localProducts)
          setStatus("offline-ready")
        } else {
          setStatus("offline-ready")
        }
      }
    } else {
      // Offline mode
      if (localProducts.length > 0) {
        loadLocalProducts(localProducts)
        try {
          const stats = await getLocalDB_Stats()
          setPendingCount(stats.pending)
        } catch {}
        setStatus("offline-ready")
      } else {
        setStatus("offline-ready")
      }
    }

    // Cleanup old synced sales (> 7 days)
    cleanupSyncedSales(7).catch(() => {})
  }, [loadLocalProducts])

  useEffect(() => {
    initializePOS()

    // Setup Connection Listeners
    const store = usePOSConnectionStore.getState()

    const handleOnline = async () => {
      store.setOnline(true)
      toast("🌐 Back online!", { icon: "🟢" })
      const { refreshProductsFromCloud, runSync } = await import(
        "@/lib/pos-sync"
      )
      await refreshProductsFromCloud()
      const result = await runSync()
      if (result.synced > 0) {
        toast.success(`✅ ${result.synced} sale(s) synced`)
      }
      if (result.failed > 0) {
        toast.error(`⚠️ ${result.failed} sale(s) failed sync`)
      }
    }

    const handleOffline = () => {
      store.setOnline(false)
      toast("⚡ Offline mode active", { icon: "🟡", duration: 3500 })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Periodic refresh every 5 minutes when online
    const interval = setInterval(async () => {
      if (navigator.onLine) {
        const { refreshProductsFromCloud } = await import("@/lib/pos-sync")
        await refreshProductsFromCloud()
      }
    }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [initializePOS])

  const handleRetry = async () => {
    setIsRetrying(true)
    await initializePOS()
    setIsRetrying(false)
  }

  const handleLoadSampleCatalog = async () => {
    setIsRetrying(true)
    try {
      const { INITIAL_PRODUCTS } = await import("@/lib/initial-catalog")
      const { syncProductsToLocal } = await import("@/lib/pos-db-local")
      await syncProductsToLocal(INITIAL_PRODUCTS)
      loadLocalProducts(INITIAL_PRODUCTS)
      setStatus("offline-ready")
      toast.success("Loaded 20 Pakistani pharmacy medicines! Offline POS active.", { duration: 4000 })
    } catch (err: any) {
      toast.error("Failed to load sample products: " + err.message)
    } finally {
      setIsRetrying(false)
    }
  }

  const isPlaceholderConfig = Boolean(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT_ID")
  )

  if (status === "loading") return <POSLoadingScreen />
  if (status === "no-data") {
    return (
      <POSNoDataScreen
        onRetry={handleRetry}
        onLoadSampleCatalog={handleLoadSampleCatalog}
        isRetrying={isRetrying}
        isPlaceholderConfig={isPlaceholderConfig}
      />
    )
  }

  return (
    <>
      {status === "offline-ready" && (
        <div className="w-full text-center text-amber-400 text-xs bg-amber-500/10 border-b border-amber-500/20 py-1.5 px-4 font-medium flex items-center justify-center gap-2">
          <span>⚡ Operating in offline mode using local database</span>
          <span className="text-gray-400 text-[11px]">
            — Changes will automatically sync when online
          </span>
        </div>
      )}
      {children}
    </>
  )
}
