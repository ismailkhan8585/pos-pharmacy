"use client"

import { useRef, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ScanBarcode, Loader2 } from "lucide-react"
import { Modal, inputCls, btnPrimary } from "@/components/ui"
import toast from "react-hot-toast"

interface Props {
  isOpen: boolean
  onClose: () => void
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [manualInput, setManualInput] = useState("")
  const codeReaderRef = useRef<any>(null)

  useEffect(() => {
    if (!isOpen) {
      stopScanning()
      return
    }
    // Wait a tick so the dialog (and <video>) is mounted
    const t = setTimeout(startScanning, 60)
    return () => {
      clearTimeout(t)
      stopScanning()
    }
  }, [isOpen])

  const startScanning = async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library")
      if (!videoRef.current) return
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader

      const devices = await codeReader.listVideoInputDevices()
      // Prefer the rear camera on phones/tablets
      const rear = devices.find((d) => /back|rear|environment/i.test(d.label))
      const deviceId = rear?.deviceId || devices[0]?.deviceId

      setIsScanning(true)
      codeReader.decodeFromVideoDevice(deviceId || null, videoRef.current!, (result) => {
        if (result) {
          const barcode = result.getText()
          stopScanning()
          onScan(barcode)
          onClose()
        }
      })
    } catch (err) {
      console.error("Barcode scanner error:", err)
      toast.error("Camera not available — type the code instead")
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset()
      } catch {}
      codeReaderRef.current = null
    }
    setIsScanning(false)
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      setManualInput("")
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} icon={ScanBarcode} title="Scan barcode" subtitle="Hold the barcode inside the frame" size="sm">
      {/* Camera preview */}
      <div className="relative aspect-4/3 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />

        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.65)_75%)]" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-[70%] h-[45%]">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-teal-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-teal-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-teal-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-teal-400 rounded-br-xl" />
            {isScanning && (
              <motion.div
                className="absolute left-3 right-3 h-0.5 bg-teal-400 shadow-[0_0_12px_2px_rgba(45,212,162,0.8)] rounded-full"
                animate={{ top: ["8%", "92%", "8%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>
        </div>

        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
            <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
            <p className="text-gray-300 text-sm">Starting camera…</p>
          </div>
        )}
      </div>

      {/* Manual entry */}
      <form onSubmit={handleManualSubmit} className="p-5 space-y-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">Or type the code</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g. 8964000123456"
            className={`${inputCls} font-mono`}
            autoFocus
          />
          <button type="submit" disabled={!manualInput.trim()} className={btnPrimary}>
            Add
          </button>
        </div>
      </form>
    </Modal>
  )
}
