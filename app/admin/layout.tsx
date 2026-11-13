"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, ReceiptText, Package, BarChart3, Truck, LogOut, ShieldAlert, Lock, MonitorPlay, Loader2 } from "lucide-react"
import { isAuthenticated, clearSession, verifyPin } from "@/lib/auth"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { btnPrimary } from "@/components/ui"
import toast from "react-hot-toast"

const NAV_ITEMS = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Sales", href: "/admin/sales", icon: ReceiptText },
  { label: "Stock", href: "/admin/stock", icon: Package },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Suppliers", href: "/admin/suppliers", icon: Truck },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const storeName = usePOSSettingsStore((s) => s.storeName)
  const ownerName = usePOSSettingsStore((s) => s.ownerName)
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) setAuthed(true)
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
        toast.success(`Welcome, ${(ownerName || "Owner").split(" ")[0]}`)
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

  if (!authed) {
    return (
      <div className="min-h-screen bg-pos-bg flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-sm w-full glass border border-pos-borderHi rounded-3xl p-7 text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/25 text-teal-300 mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-grotesk text-white">Owner dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">{storeName} · enter your 4-digit PIN</p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              autoFocus
              className="w-full h-14 bg-pos-bg border border-pos-border rounded-2xl text-center text-3xl tracking-[0.6em] font-mono text-white placeholder-gray-700 focus:outline-none focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/10"
            />
            {error && (
              <p className="text-sm text-red-400 flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                {error}
              </p>
            )}
            <button type="submit" disabled={pin.length !== 4 || isVerifying} className={`${btnPrimary} w-full h-12`}>
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isVerifying ? "Verifying…" : "Unlock"}
            </button>
          </form>

          <Link href="/pos" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <MonitorPlay className="w-3.5 h-3.5" /> Back to POS counter
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app-main min-h-screen h-screen overflow-y-auto flex flex-col pb-24 md:pb-0 text-white">
      <header className="h-16 border-b border-pos-border bg-pos-bg/80 backdrop-blur-xl flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20 ring-1 ring-white/10"
            style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
          >
            ✚
          </div>
          <div>
            <h1 className="font-grotesk font-bold text-[15px] text-white leading-tight">{storeName}</h1>
            <p className="text-[11px] text-gray-500">{ownerName} · Owner</p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center p-1 rounded-xl border border-pos-border bg-pos-card">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
                  active ? "bg-white/7 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-teal-300" : ""}`} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/pos" className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-pos-card border border-pos-border text-xs text-gray-300 hover:text-white">
            <MonitorPlay className="w-4 h-4" />
            <span className="hidden sm:inline">POS</span>
          </Link>
          <button onClick={handleLogout} className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 h-16 glass border border-pos-borderHi rounded-2xl flex items-center justify-around px-1 z-40">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== "/admin" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
                active ? "text-teal-300 bg-teal-500/10" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
