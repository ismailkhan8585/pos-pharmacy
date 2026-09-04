"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  Package,
  BarChart3,
  Truck,
  LogOut,
  ShieldAlert,
} from "lucide-react"
import { isAuthenticated, clearSession, verifyPin } from "@/lib/auth"
import toast from "react-hot-toast"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true)
    }
  }, [])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) return
    setIsVerifying(true)
    setError("")
    try {
      const res = await verifyPin(pin)
      if (res.success) {
        setAuthed(true)
        toast.success("Welcome Adil Nawaz (Admin)")
      } else {
        setError(res.error || "Incorrect PIN")
        setPin("")
      }
    } catch {
      setError("Verification failed")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    setAuthed(false)
    router.push("/login")
  }

  // PIN lock screen for Admin if not authenticated
  if (!authed) {
    return (
      <div className="min-h-screen bg-pos-bg flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-pos-panel border border-pos-border rounded-3xl p-6 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center text-2xl font-bold">
            ✚
          </div>

          <div>
            <h1 className="text-xl font-bold font-grotesk text-white">
              AN MedCare Admin
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Mobile Owner Dashboard · Enter PIN
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoFocus
                className="w-48 h-12 mx-auto bg-pos-card border border-pos-border rounded-xl text-center text-2xl tracking-widest font-mono text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center justify-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pin.length !== 4 || isVerifying}
              className="w-full h-11 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-40"
            >
              {isVerifying ? "Verifying..." : "Unlock Dashboard"}
            </button>
          </form>

          <Link
            href="/pos"
            className="inline-block text-xs text-gray-500 hover:text-gray-300"
          >
            ← Back to Counter POS
          </Link>
        </div>
      </div>
    )
  }

  const NAV_ITEMS = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Sales", href: "/admin/sales", icon: Receipt },
    { label: "Stock", href: "/admin/stock", icon: Package },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Suppliers", href: "/admin/suppliers", icon: Truck },
  ]

  return (
    <div className="min-h-screen bg-pos-bg flex flex-col pb-20 md:pb-0 text-white">
      {/* Top Mobile Bar */}
      <header className="h-14 border-b border-pos-border bg-pos-panel flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
            ✚
          </div>
          <div>
            <h1 className="font-grotesk font-bold text-sm text-white leading-tight">
              AN MedCare
            </h1>
            <p className="text-[10px] text-gray-500">Adil Nawaz · Admin View</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="px-2.5 py-1 rounded-lg bg-pos-card border border-pos-border text-xs text-gray-300 hover:text-white"
          >
            POS Counter
          </Link>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4">{children}</main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-pos-panel/95 backdrop-blur-md border-t border-pos-border flex items-center justify-around px-2 z-40">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-16 py-1 rounded-xl transition-all ${
                isActive
                  ? "text-teal-400 font-semibold"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
