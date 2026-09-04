"use client"

import { useState, useEffect } from "react"
import toast from "react-hot-toast"

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (typeof window === "undefined") return
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches
    if (isInstalled) return

    // Check if already dismissed
    const dismissed = localStorage.getItem("pwa-dismissed")
    if (dismissed) return

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      toast.success("AN MedCare POS installed! 🎉")
    }
    setShowBanner(false)
  }

  const handleDismiss = () => {
    localStorage.setItem("pwa-dismissed", "true")
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-[#1C1C22] border border-[#2E2E3A] rounded-2xl p-4 shadow-2xl shadow-teal-500/10 flex items-center gap-4 animate-pop-in">
      <div className="w-12 h-12 bg-teal-500/20 text-teal-400 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
        🏥
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">
          Install AN MedCare POS
        </p>
        <p className="text-gray-400 text-[11px] mt-0.5 leading-snug">
          Works 100% offline, full screen, fast counter launch
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDismiss}
          className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 font-medium transition-colors"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-md shadow-teal-500/20 active:scale-95 transition-all"
        >
          Install
        </button>
      </div>
    </div>
  )
}
