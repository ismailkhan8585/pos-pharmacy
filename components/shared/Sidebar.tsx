"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  MonitorPlay, Package, PackageCheck, ClipboardList,
  AlertTriangle, Settings2, Truck, ShoppingCart,
  BarChart3, Clock, Settings, LogOut, ChevronRight,
} from "lucide-react"
import { clearSession } from "@/lib/auth"
import { useRouter } from "next/navigation"

const NAV_ITEMS = [
  {
    label: "POS Counter",
    href: "/pos",
    icon: MonitorPlay,
    color: "teal",
  },
  { divider: true, label: "Inventory" },
  { label: "Products",      href: "/inventory/products",  icon: Package },
  { label: "Receive Stock", href: "/inventory/receive",   icon: PackageCheck },
  { label: "Stock Count",   href: "/inventory/count",     icon: ClipboardList },
  { label: "Expiry Mgmt",   href: "/inventory/expiry",    icon: AlertTriangle },
  { label: "Adjust Stock",  href: "/inventory/adjust",    icon: Settings2 },
  { divider: true, label: "Purchasing" },
  { label: "Suppliers",     href: "/suppliers",           icon: Truck },
  { label: "Purchases",     href: "/purchases",           icon: ShoppingCart },
  { divider: true, label: "Business" },
  { label: "Reports",       href: "/reports",             icon: BarChart3 },
  { label: "Shifts",        href: "/shifts",              icon: Clock },
  { label: "Settings",      href: "/settings",            icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    if (confirm("End session and logout?")) {
      clearSession()
      router.push("/login")
    }
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col h-full bg-pos-panel border-r border-pos-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-pos-border flex-shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))" }}
        >
          ✚
        </div>
        <div>
          <p className="font-grotesk font-bold text-white text-sm leading-none">AN MedCare</p>
          <p className="text-gray-600 text-[10px] mt-0.5">Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map((item, idx) => {
          if ("divider" in item && item.divider) {
            return (
              <div key={idx} className="pt-3 pb-1 px-2">
                <p className="text-gray-700 text-[10px] font-semibold uppercase tracking-wider">{item.label}</p>
              </div>
            )
          }

          const isActive = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href!))
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`
                flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-150 group
                ${
                  isActive
                    ? "bg-teal-500/15 text-teal-400 border border-teal-500/20"
                    : "text-gray-500 hover:text-gray-300 hover:bg-pos-card border border-transparent"
                }
              `}
            >
              {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-pos-border flex-shrink-0 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center">
            <span className="text-teal-400 text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">Adil Nawaz</p>
            <p className="text-gray-600 text-[10px]">Owner</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 text-sm"
        >
          <LogOut className="w-4 h-4" />
          End Session
        </button>
      </div>
    </aside>
  )
}
