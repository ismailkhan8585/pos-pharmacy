"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { X, Delete, Check } from "lucide-react"

interface Props {
  initial?: number
  max?: number
  label?: string
  onConfirm: (value: number) => void
  onClose: () => void
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "✓"]

export default function NumericKeypad({ initial = 1, max = 9999, label, onConfirm, onClose }: Props) {
  const [value, setValue] = useState(String(initial))
  // First digit typed replaces the existing value
  const fresh = useRef(true)

  const press = (key: string) => {
    if (key === "⌫") {
      fresh.current = false
      setValue((v) => (v.length > 1 ? v.slice(0, -1) : "0"))
      return
    }
    if (key === "✓") {
      const num = parseInt(value) || 0
      onConfirm(Math.min(num, max))
      return
    }
    setValue((v) => {
      const base = fresh.current || v === "0" ? "" : v
      fresh.current = false
      const next = base + key
      if (parseInt(next) > max) return String(max)
      return next
    })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === "Backspace") press("⌫")
      else if (e.key === "Enter") press("✓")
      else if (e.key === "Escape") onClose()
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  })

  const num = parseInt(value) || 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 24, scale: 0.96, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 24, scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 340 }}
        className="glass border border-pos-borderHi rounded-3xl p-5 w-full max-w-80 mx-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 font-semibold">Quantity</p>
            {label && <p className="text-white text-sm font-medium truncate">{label}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-pos-bg border border-pos-border rounded-2xl h-16 flex items-center justify-between px-4 mb-4">
          <span className="text-[11px] text-gray-500">max {max}</span>
          <span className={`font-mono text-4xl font-bold tabular ${num === 0 ? "text-red-400" : "text-white"}`}>
            {value}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => press(key)}
              className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 active:scale-95 flex items-center justify-center ${
                key === "✓"
                  ? "bg-teal-500 text-white hover:bg-teal-400 shadow-lg shadow-teal-500/30"
                  : key === "⌫"
                  ? "bg-pos-card text-gray-300 border border-pos-border hover:text-red-300 hover:border-red-500/30"
                  : "bg-pos-card text-white border border-pos-border hover:bg-pos-cardHover font-mono"
              }`}
            >
              {key === "⌫" ? <Delete className="w-5 h-5" /> : key === "✓" ? <Check className="w-6 h-6" /> : key}
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-[11px] text-center mt-3">
          {num === 0 ? "0 removes the item" : "Type on keyboard · Enter to confirm"}
        </p>
      </motion.div>
    </motion.div>
  )
}
