"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Delete } from "lucide-react"

interface Props {
  initial?: number
  max?: number
  label?: string
  onConfirm: (value: number) => void
  onClose: () => void
}

export default function NumericKeypad({ initial = 1, max = 9999, label, onConfirm, onClose }: Props) {
  const [value, setValue] = useState(String(initial))

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setValue((v) => (v.length > 1 ? v.slice(0, -1) : "0"))
      return
    }
    if (key === "✓") {
      const num = parseInt(value) || 1
      onConfirm(Math.min(num, max))
      return
    }
    setValue((v) => {
      if (v === "0") return key
      const next = v + key
      if (parseInt(next) > max) return v
      return next
    })
  }

  const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "✓"]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-pos-modal border border-pos-border rounded-t-2xl p-4 w-full max-w-xs"
      >
        {/* Label */}
        {label && (
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-400 text-sm truncate flex-1">{label}</p>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Display */}
        <div className="bg-pos-card border border-pos-border rounded-xl h-14 flex items-center justify-end px-4 mb-3">
          <span className="font-mono text-3xl text-white font-bold">{value}</span>
        </div>

        {/* Keys */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => handleKey(key)}
              className={`
                h-12 rounded-xl font-bold text-lg transition-all duration-100
                active:scale-95
                ${key === "✓"
                  ? "bg-teal-500 text-white hover:bg-teal-600"
                  : key === "⌫"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  : "bg-pos-card text-white border border-pos-border hover:bg-pos-cardHover"
                }
              `}
            >
              {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        <p className="text-gray-700 text-xs text-center mt-2">Max: {max}</p>
      </motion.div>
    </motion.div>
  )
}
