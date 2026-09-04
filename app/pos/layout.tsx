"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

import POSInitializer from "@/components/pos/POSInitializer"
import SyncStatusBar from "@/components/pos/SyncStatusBar"
import PWAInstallBanner from "@/components/pos/PWAInstallBanner"

export default function POSLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login")
    }
  }, [router])

  return (
    <div className="pos-layout relative">
      <SyncStatusBar />
      <POSInitializer>
        {children}
        <PWAInstallBanner />
      </POSInitializer>
    </div>
  )
}
