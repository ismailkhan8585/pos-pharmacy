"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Package2,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  AlertTriangle,
  UserRound,
  Power,
} from "lucide-react"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { formatShiftDuration } from "@/lib/pos-helpers"
import { clearSession } from "@/lib/auth"
import ConnectionStatus from "./ConnectionStatus"

const NAV = [
  { href: "/inventory/products", label: "Stock", icon: Package2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function POSHeader() {
  const router = useRouter()
  const storeName = usePOSSettingsStore((s) => s.storeName)
  const currentShift = usePOSShiftStore((s) => s.currentShift)
  const [now, setNow] = useState<Date | null>(null)
  const [shiftDuration, setShiftDuration] = useState("")

  // Clock (updates every 15s — minute precision is enough)
  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 15000)
    return () => clearInterval(interval)
  }, [])

  // Shift duration
  useEffect(() => {
    if (!currentShift.openedAt) return
    const update = () => setShiftDuration(formatShiftDuration(currentShift.openedAt!))
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [currentShift.openedAt])

  const handleLogout = () => {
    if (confirm("End session and logout?")) {
      clearSession()
      router.push("/login")
    }
  }

  const isShiftOpen = currentShift.status === "OPEN"
  const isLongShift = currentShift.openedAt
    ? Date.now() - new Date(currentShift.openedAt).getTime() > 8 * 60 * 60 * 1000
    : false

  return (
    <header className="relative flex items-center justify-between gap-4 px-4 h-14 border-b border-pos-border bg-pos-bg/95 backdrop-blur shrink-0 z-20">
      {/* Left: Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-white shrink-0 shadow-lg shadow-teal-500/20 ring-1 ring-white/10"
          style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
        >
          ✚
        </div>
        <div className="hidden sm:flex flex-col leading-tight min-w-0">
          <span className="font-grotesk font-bold text-white text-[15px] truncate">
            {storeName || "AN MedCare"}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-medium">
            Point of Sale
          </span>
        </div>
      </div>

      {/* Center: Status cluster */}
      <div className="hidden md:flex items-center gap-2">
        <ConnectionStatus />

        <div className="flex items-center gap-2 h-7 px-3 rounded-full border border-pos-border bg-pos-card text-[11px] text-gray-400">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          {now && (
            <>
              <span className="text-gray-500 hidden lg:inline">
                {now.toLocaleDateString("en-PK", { weekday: "short", day: "2-digit", month: "short" })}
              </span>
              <span className="w-px h-3 bg-pos-border hidden lg:inline-block" />
              <span className="font-mono text-gray-200 tabular">
                {now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Shift + Navigation */}
      <div className="flex items-center gap-2">
        {isShiftOpen && (
          <Link
            href="/shifts"
            title="Shift details"
            className={`hidden sm:flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-xl border text-xs transition-all duration-150 ${
              isLongShift
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/15"
                : "bg-pos-card text-gray-300 border-pos-border hover:border-pos-borderHi"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isLongShift ? "bg-amber-500/20" : "bg-teal-500/15 text-teal-400"
              }`}
            >
              {isLongShift ? <AlertTriangle className="w-3.5 h-3.5" /> : <UserRound className="w-3.5 h-3.5" />}
            </span>
            <span className="flex flex-col leading-tight text-left">
              <span className="font-medium text-[11px] text-white truncate max-w-27.5">
                {currentShift.operatorName}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                Shift · {shiftDuration || "…"}
              </span>
            </span>
          </Link>
        )}

        {/* Nav group */}
        <nav className="flex items-center p-1 rounded-xl border border-pos-border bg-pos-card">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-150 text-xs font-medium"
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xl:block">{label}</span>
            </Link>
          ))}
        </nav>

        {isShiftOpen && (
          <Link
            href="/shifts"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-orange-300 border border-orange-500/25 bg-orange-500/5 hover:bg-orange-500/15 text-xs font-semibold transition-all duration-150"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">End Shift</span>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 border border-transparent hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-150"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
