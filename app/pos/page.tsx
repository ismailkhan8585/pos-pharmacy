"use client"

import { useEffect, useState } from "react"
import { usePOSProductsStore } from "@/stores/pos-products"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSCartStore } from "@/stores/pos-cart"
import POSHeader from "@/components/pos/POSHeader"
import OfflineBanner from "@/components/pos/OfflineBanner"
import ProductSearch, { FOCUS_SEARCH_EVENT } from "@/components/pos/ProductSearch"
import CategoryTabs from "@/components/pos/CategoryTabs"
import ProductGrid from "@/components/pos/ProductGrid"
import BillPanel from "@/components/pos/BillPanel"
import LowStockBanner from "@/components/pos/LowStockBanner"
import BarcodeScanner from "@/components/pos/BarcodeScanner"
import PaymentModal from "@/components/pos/PaymentModal"
import ReceiptModal from "@/components/pos/ReceiptModal"
import HoldBillModal from "@/components/pos/HoldBillModal"
import ReturnModal from "@/components/pos/ReturnModal"
import OpenShiftModal from "@/components/shifts/OpenShiftModal"
import toast from "react-hot-toast"

const focusSearch = () => setTimeout(() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT)), 80)

export default function POSPage() {
  const getProductByBarcode = usePOSProductsStore((s) => s.getProductByBarcode)
  const shiftStatus = usePOSShiftStore((s) => s.currentShift.status)
  const addItem = usePOSCartStore((s) => s.addItem)

  // Modal states
  const [showBarcode, setShowBarcode] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showHold, setShowHold] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  const anyModalOpen = showBarcode || showPayment || showReceipt || showHold || showReturn || showOpenShift

  // Show open shift modal if no shift active
  useEffect(() => {
    if (shiftStatus !== "OPEN") setShowOpenShift(true)
  }, [shiftStatus])

  // Global keyboard shortcuts (only while no dialog is open)
  useEffect(() => {
    if (anyModalOpen) return
    const handler = (e: KeyboardEvent) => {
      const cartEmpty = usePOSCartStore.getState().items.length === 0
      if (e.key === "F9" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        if (cartEmpty) toast("Add items first", { icon: "🛒" })
        else setShowPayment(true)
      } else if (e.key === "F4") {
        e.preventDefault()
        setShowHold(true)
      } else if (e.key === "F8") {
        e.preventDefault()
        setShowReturn(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [anyModalOpen])

  const handleBarcodeScanned = (barcode: string) => {
    const product = getProductByBarcode(barcode)
    if (!product) {
      toast.error(`Product not found: ${barcode}`)
      return
    }
    const result = addItem(product)
    if (result === "added") toast.success(`${product.nameEn} added`, { duration: 1200 })
    else if (result === "out_of_stock") toast.error(`${product.nameEn} is out of stock`)
    else toast.error(`Only ${product.stock} in stock`)
  }

  const handlePaymentSuccess = (data: any) => {
    setReceiptData(data)
    setShowPayment(false)
    setShowReceipt(true)
  }

  const handleNewSale = () => {
    setShowReceipt(false)
    setReceiptData(null)
    focusSearch()
  }

  const closeAnd = (setter: (v: boolean) => void) => () => {
    setter(false)
    focusSearch()
  }

  return (
    <>
      <POSHeader />
      <OfflineBanner />

      <div className="pos-content">
        {/* LEFT PANEL — Product Browser */}
        <div className="pos-left">
          <ProductSearch onBarcodeClick={() => setShowBarcode(true)} />
          <CategoryTabs />
          <LowStockBanner />
          <ProductGrid />
        </div>

        {/* RIGHT PANEL — Bill */}
        <div className="pos-right">
          <BillPanel
            onCheckout={() => setShowPayment(true)}
            onHold={() => setShowHold(true)}
            onReturn={() => setShowReturn(true)}
          />
        </div>
      </div>

      {/* MODALS */}
      <BarcodeScanner isOpen={showBarcode} onClose={closeAnd(setShowBarcode)} onScan={handleBarcodeScanned} />

      <PaymentModal isOpen={showPayment} onClose={closeAnd(setShowPayment)} onSuccess={handlePaymentSuccess} />

      <ReceiptModal
        isOpen={showReceipt}
        receiptData={receiptData}
        onClose={closeAnd(setShowReceipt)}
        onNewSale={handleNewSale}
      />

      <HoldBillModal isOpen={showHold} onClose={closeAnd(setShowHold)} />

      <ReturnModal isOpen={showReturn} onClose={closeAnd(setShowReturn)} />

      <OpenShiftModal isOpen={showOpenShift} onClose={closeAnd(setShowOpenShift)} />
    </>
  )
}
