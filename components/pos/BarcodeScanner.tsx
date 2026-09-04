"use client"

import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Camera } from "lucide-react"
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

    startScanning()

    return () => stopScanning()
  }, [isOpen])

  const startScanning = async () => {
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/library")
      const codeReader = new BrowserMultiFormatReader()
      codeReaderRef.current = codeReader
      setIsScanning(true)

      const devices = await codeReader.listVideoInputDevices()
      const deviceId = devices.length > 0 ? devices[0].deviceId : undefined

      codeReader.decodeFromVideoDevice(deviceId || null, videoRef.current!, (result, error) => {
        if (result) {
          const barcode = result.getText()
          stopScanning()
          onScan(barcode)
          onClose()
        }
      })
    } catch (err) {
      console.error("Barcode scanner error:", err)
      toast.error("Camera not available")
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative bg-pos-modal border border-pos-border rounded-2xl overflow-hidden w-full max-w-sm mx-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-pos-border">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-teal-400" />
                <h3 className="font-grotesk font-semibold text-white">Barcode Scanner</h3>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera Preview */}
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />

              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-teal-400 rounded-tl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-400 rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-400 rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-teal-400 rounded-br" />

                  {/* Scan line */}
                  {isScanning && (
                    <motion.div
                      className="absolute left-0 right-0 h-0.5 bg-teal-400"
                      animate={{ top: ["10%", "90%", "10%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                </div>
              </div>

              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <p className="text-gray-400 text-sm">Starting camera…</p>
                </div>
              )}
            </div>

            {/* Manual Input */}
            <div className="p-4">
              <p className="text-gray-500 text-xs text-center mb-3">
                Or enter barcode manually
              </p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Type barcode…"
                  className="flex-1 h-10 px-3 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/50"
                  autoFocus
                />
                <button
                  type="submit"
                  className="h-10 px-4 bg-teal-500 hover:bg-teal-600 rounded-xl text-white text-sm font-medium transition-colors"
                >
                  Search
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
