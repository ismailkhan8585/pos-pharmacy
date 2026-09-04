"use client"

import { useEffect, useState } from "react"
import { usePOSProductsStore } from "@/stores/pos-products"
import { usePOSShiftStore } from "@/stores/pos-shift"
import POSHeader from "@/components/pos/POSHeader"
import OfflineBanner from "@/components/pos/OfflineBanner"
import ConnectionStatus from "@/components/pos/ConnectionStatus"
import ProductSearch from "@/components/pos/ProductSearch"
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
import { usePOSCartStore } from "@/stores/pos-cart"

export default function POSPage() {
  const { getProductByBarcode } = usePOSProductsStore()
  const { currentShift } = usePOSShiftStore()
  const { addItem } = usePOSCartStore()

  // Modal states
  const [showBarcode, setShowBarcode] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showHold, setShowHold] = useState(false)
  const [showReturn, setShowReturn] = useState(false)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Show open shift modal if no shift active
  useEffect(() => {
    if (currentShift.status !== "OPEN") {
      setShowOpenShift(true)
    }
  }, [currentShift.status])

  const handleBarcodeScanned = (barcode: string) => {
    const product = getProductByBarcode(barcode)
    if (product) {
      addItem(product)
    } else {
      import("react-hot-toast").then(({ default: toast }) => {
        toast.error(`Product not found: ${barcode}`)
      })
    }
  }

  const handlePaymentSuccess = (data: any) => {
    setReceiptData(data)
    setShowPayment(false)
    setShowReceipt(true)
  }

  const handleNewSale = () => {
    setShowReceipt(false)
    setReceiptData(null)
  }

  return (
    <>
      <ConnectionStatus />

      {/* POS Two-Panel Layout */}
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
      <BarcodeScanner
        isOpen={showBarcode}
        onClose={() => setShowBarcode(false)}
        onScan={handleBarcodeScanned}
      />

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      <ReceiptModal
        isOpen={showReceipt}
        receiptData={receiptData}
        onClose={() => setShowReceipt(false)}
        onNewSale={handleNewSale}
      />

      <HoldBillModal
        isOpen={showHold}
        onClose={() => setShowHold(false)}
      />

      <ReturnModal
        isOpen={showReturn}
        onClose={() => setShowReturn(false)}
      />

      <OpenShiftModal
        isOpen={showOpenShift}
        onClose={() => setShowOpenShift(false)}
      />
    </>
  )
}
