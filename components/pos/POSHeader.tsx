"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Package2,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react"
import { usePOSCartStore } from "@/stores/pos-cart"
import { usePOSShiftStore } from "@/stores/pos-shift"
import { formatShiftDuration } from "@/lib/pos-helpers"
import { clearSession } from "@/lib/auth"
import Link from "next/link"
import ConnectionStatus from "./ConnectionStatus"

export default function POSHeader() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState("")
  const getBillNumber = usePOSCartStore((s) => s.getBillNumber)
  const { currentShift } = usePOSShiftStore()
  const [shiftDuration, setShiftDuration] = useState("")

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString("en-PK", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
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

  const isLongShift =
    currentShift.openedAt
      ? Date.now() - new Date(currentShift.openedAt).getTime() > 8 * 60 * 60 * 1000
      : false

  return (
    <header className="flex items-center justify-between px-4 h-16 border-b border-pos-border bg-pos-panel flex-shrink-0 z-20">
      {/* Left: Logo + Bill Number */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))" }}
          >
            ✚
          </div>
          <span className="font-grotesk font-bold text-white text-sm hidden sm:block">
            AN MedCare POS
          </span>
        </div>

        <div className="h-5 w-px bg-pos-border" />

        <span className="font-mono text-xs text-gray-500 bg-pos-card px-2 py-1 rounded-lg border border-pos-border">
          {getBillNumber()}
        </span>
      </div>

      {/* Center: Status */}
      <div className="flex items-center gap-3">
        <ConnectionStatus />

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{currentTime}</span>
        </div>
      </div>

      {/* Right: Navigation */}
      <div className="flex items-center gap-1">
        <Link
          href="/inventory/products"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all duration-150 text-xs"
        >
          <Package2 className="w-4 h-4" />
          <span className="hidden md:block">Stock</span>
        </Link>

        <Link
          href="/reports"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all duration-150 text-xs"
        >
          <BarChart3 className="w-4 h-4" />
          <span className="hidden md:block">Reports</span>
        </Link>

        <Link
          href="/settings"
          className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-pos-card transition-all duration-150"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* Shift Badge */}
        {currentShift.status === "OPEN" && (
          <Link
            href="/shifts"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
              isLongShift
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-teal-500/10 text-teal-400 border-teal-500/30"
            }`}
          >
            {isLongShift && <AlertTriangle className="w-3 h-3" />}
            <Clock className="w-3 h-3" />
            <span>Shift: {shiftDuration || "..."}</span>
          </Link>
        )}

        {currentShift.status === "OPEN" && (
          <Link
            href="/shifts"
            className="px-3 py-1.5 rounded-lg text-orange-400 hover:bg-orange-500/10 text-xs font-medium transition-all duration-150 border border-transparent hover:border-orange-500/30"
          >
            End Shift
          </Link>
        )}

        <div className="h-5 w-px bg-pos-border mx-1" />

        <button
          onClick={handleLogout}
          className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
