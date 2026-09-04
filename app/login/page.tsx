"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { verifyPin, isAuthenticated, isLockedOut } from "@/lib/auth"
import { Delete } from "lucide-react"

const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"]

export default function LoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [lockoutMsg, setLockoutMsg] = useState("")
  const [shakeKey, setShakeKey] = useState(0)
  const maxPin = 6

  // Check if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/pos")
    }
  }, [router])

  // Check lockout
  useEffect(() => {
    const checkLockout = () => {
      const { locked, remainingMs } = isLockedOut()
      if (locked) {
        const mins = Math.ceil(remainingMs / 60000)
        setLockoutMsg(`Locked out. Try again in ${mins} min.`)
      } else {
        setLockoutMsg("")
      }
    }
    checkLockout()
    const interval = setInterval(checkLockout, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleKey = useCallback(
    async (key: string) => {
      if (lockoutMsg) return
      setError("")

      if (key === "⌫") {
        setPin((prev) => prev.slice(0, -1))
        return
      }

      if (pin.length >= maxPin) return

      const newPin = [...pin, key]
      setPin(newPin)

      // Auto-submit at maxPin (6 digits) or after 4 digits (if 4-digit PIN)
      if (newPin.length === 4 || newPin.length === maxPin) {
        setTimeout(async () => {
          setIsLoading(true)
          try {
            const result = await verifyPin(newPin.join(""))
            if (result.success) {
              router.replace("/pos")
            } else {
              setPin([])
              setShakeKey((k) => k + 1)
              setError(result.error || "Incorrect PIN")
              if (result.remainingAttempts !== undefined) {
                setError(`${result.error} (${result.remainingAttempts} left)`)
              }
            }
          } finally {
            setIsLoading(false)
          }
        }, 150)
      }
    },
    [pin, lockoutMsg, router]
  )

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKey(e.key)
      } else if (e.key === "Backspace") {
        handleKey("⌫")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKey])

  return (
    <div className="min-h-screen flex items-center justify-center bg-pos-bg relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgb(16 185 129 / 0.4), transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex flex-col items-center gap-8 w-full max-w-sm px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl shadow-teal-500/30"
            style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))" }}
          >
            ✚
          </motion.div>
          <div className="text-center">
            <h1 className="font-grotesk text-2xl font-bold text-white">AN MedCare</h1>
            <p className="text-gray-500 text-sm mt-0.5">Point of Sale System</p>
          </div>
        </div>

        {/* PIN Display */}
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-gray-400 text-sm">Enter your PIN</p>

          {/* PIN Dots */}
          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: pin.length > i ? 1 : 0.6,
                  backgroundColor: pin.length > i ? "rgb(16 185 129)" : "rgb(35 35 42)",
                }}
                transition={{ duration: 0.15 }}
                className="w-4 h-4 rounded-full"
              />
            ))}
          </motion.div>

          {/* Error / Lockout */}
          <AnimatePresence>
            {(error || lockoutMsg) && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm text-center ${lockoutMsg ? "text-amber-400" : "text-red-400"}`}
              >
                {lockoutMsg || error}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* PIN Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {PIN_KEYS.map((key, idx) => {
            if (key === "") {
              return <div key={idx} />
            }

            return (
              <motion.button
                key={key + idx}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleKey(key)}
                disabled={isLoading || !!lockoutMsg}
                className={`
                  relative h-16 rounded-2xl font-grotesk text-xl font-semibold
                  flex items-center justify-center
                  transition-all duration-150
                  ${key === "⌫"
                    ? "bg-pos-card text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                    : "bg-pos-card text-white hover:bg-pos-cardHover hover:border-teal-500/40"
                  }
                  border border-pos-border
                  disabled:opacity-40 disabled:cursor-not-allowed
                  active:bg-teal-500/20
                `}
              >
                {isLoading && pin.length > 0 && key === "0" ? (
                  <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                ) : key === "⌫" ? (
                  <Delete className="w-5 h-5" />
                ) : (
                  key
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Default PIN hint */}
        <p className="text-gray-700 text-xs text-center">
          Default PIN: 1234 · Change in Settings
        </p>
      </motion.div>
    </div>
  )
}
