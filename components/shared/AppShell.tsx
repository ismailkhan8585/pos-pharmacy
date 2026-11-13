"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import Sidebar from "@/components/shared/Sidebar"

/** Back-office shell: auth guard + sidebar + scrollable content area. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) router.replace("/login")
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden bg-pos-bg">
      <Sidebar />
      <main className="app-main flex-1 overflow-y-auto">
        <div className="app-page">{children}</div>
      </main>
    </div>
  )
}
