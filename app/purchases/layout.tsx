"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import Sidebar from "@/components/shared/Sidebar"

export default function PurchasesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.replace("/login") }, [router])
  return (
    <div className="flex h-screen overflow-hidden bg-pos-bg">
      <Sidebar /><main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
