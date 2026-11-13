"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  MonitorPlay,
  Package,
  PackageCheck,
  ClipboardList,
  CalendarClock,
  SlidersHorizontal,
  Truck,
  ShoppingCart,
  BarChart3,
  Clock,
  Settings,
  LogOut,
  ArrowUpRight,
} from "lucide-react"
import { clearSession } from "@/lib/auth"
import { usePOSSettingsStore } from "@/stores/pos-settings"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { usePOSConnectionStore } from "@/stores/pos-connection"

const NAV_GROUPS = [
  {
    label: "Inventory",
    items: [
      { label: "Products", href: "/inventory/products", icon: Package },
      { label: "Receive Stock", href: "/inventory/receive", icon: PackageCheck },
      { label: "Stock Count", href: "/inventory/count", icon: ClipboardList },
      { label: "Expiry", href: "/inventory/expiry", icon: CalendarClock },
      { label: "Adjust Stock", href: "/inventory/adjust", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Purchasing",
    items: [
      { label: "Suppliers", href: "/suppliers", icon: Truck },
      { label: "Purchases", href: "/purchases", icon: ShoppingCart },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3 },
      { label: "Shifts", href: "/shifts", icon: Clock },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const storeName = usePOSSettingsStore((s) => s.storeName)
  const ownerName = usePOSSettingsStore((s) => s.ownerName)
  const shift = usePOSShiftStore((s) => s.currentShift)
  const isOnline = usePOSConnectionStore((s) => s.isOnline)
  const pending = usePOSConnectionStore((s) => s.pendingCount)

  const handleLogout = () => {
    if (confirm("End session and logout?")) {
      clearSession()
      router.push("/login")
    }
  }

  const name = shift.status === "OPEN" ? shift.operatorName : ownerName
  const initials = (name || "A")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <aside className="w-60 shrink-0 flex flex-col h-full bg-pos-panel border-r border-pos-border relative">
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.10),transparent_70%)] pointer-events-none" />

      {/* Brand */}
      <div className="relative flex items-center gap-3 px-4 h-16 shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold text-white shadow-lg shadow-teal-500/20 ring-1 ring-white/10"
          style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
        >
          ✚
        </div>
        <div className="min-w-0">
          <p className="font-grotesk font-bold text-white text-[15px] leading-tight truncate">{storeName || "AN MedCare"}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-medium">Back office</p>
        </div>
      </div>

      {/* POS CTA */}
      <div className="relative px-3 pb-2">
        <Link
          href="/pos"
          className="group flex items-center gap-3 h-11 px-3 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-emerald-500 to-teal-600 shadow-[0_10px_24px_-10px_rgba(16,185,129,0.7)] hover:brightness-110 transition-all"
        >
          <MonitorPlay className="w-4 h-4" />
          Open POS Counter
          <ArrowUpRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/")
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`relative flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                      isActive ? "bg-white/6 text-white" : "text-gray-400 hover:text-white hover:bg-white/3"
                    }`}
                  >
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.75 rounded-r-full bg-teal-400 shadow-[0_0_10px_rgba(45,212,162,0.8)]" />}
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-teal-300" : ""}`} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative p-3 border-t border-pos-border shrink-0 space-y-2">
        <div className="flex items-center gap-2 px-2 text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
          <span className={isOnline ? "text-gray-400" : "text-amber-300"}>{isOnline ? "Online" : "Offline"}</span>
          {pending > 0 && <span className="ml-auto font-mono text-amber-300">{pending} to sync</span>}
        </div>
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-pos-card border border-pos-border">
          <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-300 text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{name}</p>
            <p className="text-gray-500 text-[10px]">{shift.status === "OPEN" ? "On shift" : "Owner"}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="End session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
