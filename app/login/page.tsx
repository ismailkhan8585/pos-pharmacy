"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { verifyPin, isAuthenticated, isLockedOut } from "@/lib/auth"
import { Delete, Lock, Zap, WifiOff, ShieldCheck } from "lucide-react"
import { usePOSSettingsStore } from "@/stores/pos-settings"

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

  const storeName = usePOSSettingsStore((s) => s.storeName)
  const address = usePOSSettingsStore((s) => s.address)

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-pos-bg relative overflow-hidden">
      {/* Brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 border-r border-pos-border overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_0%_0%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(700px_400px_at_100%_100%,rgba(56,189,248,0.08),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-size-[48px_48px]" />

        <div className="relative flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl text-white shadow-xl shadow-teal-500/30 ring-1 ring-white/10"
            style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
          >
            ✚
          </div>
          <div>
            <p className="font-grotesk font-bold text-white text-lg leading-tight">{storeName || "AN MedCare"}</p>
            <p className="text-xs text-gray-500">{address}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-grotesk text-4xl font-bold text-white leading-tight tracking-tight">
            Fast, reliable pharmacy billing — <span className="text-gradient-teal">online or offline.</span>
          </h2>
          <div className="mt-8 space-y-3">
            {[
              { icon: Zap, text: "Scan, bill and print in seconds" },
              { icon: WifiOff, text: "Keeps selling when the internet drops — syncs automatically" },
              { icon: ShieldCheck, text: "Stock, expiry and shift cash tracked for you" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-teal-300" />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-gray-600">© {new Date().getFullYear()} {storeName || "AN MedCare"} · Point of Sale</p>
      </div>

      {/* PIN panel */}
      <div className="relative flex items-center justify-center p-6">
        <div className="lg:hidden absolute top-0 left-1/2 -translate-x-1/2 w-150 h-75 rounded-full blur-3xl pointer-events-none bg-teal-500/10" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 w-full max-w-90"
        >
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="lg:hidden w-16 h-16 rounded-2xl flex items-center justify-center text-3xl text-white shadow-2xl shadow-teal-500/30 mb-4"
              style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
            >
              ✚
            </motion.div>
            <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 hidden lg:flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-gray-300" />
            </div>
            <h1 className="font-grotesk text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your PIN to open the counter</p>
          </div>

          {/* PIN dots */}
          <motion.div
            key={shakeKey}
            animate={shakeKey > 0 ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.3 }}
            className="flex justify-center gap-4 mb-3"
          >
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: pin.length > i ? 1 : 0.75,
                  backgroundColor: pin.length > i ? "rgb(16 185 129)" : "rgba(255,255,255,0.08)",
                  boxShadow: pin.length > i ? "0 0 14px rgba(16,185,129,0.7)" : "0 0 0 rgba(0,0,0,0)",
                }}
                transition={{ duration: 0.15 }}
                className="w-3.5 h-3.5 rounded-full"
              />
            ))}
          </motion.div>

          <div className="h-6 mb-4 flex items-center justify-center">
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

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {PIN_KEYS.map((key, idx) => {
              if (key === "") return <div key={idx} />
              return (
                <motion.button
                  key={key + idx}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleKey(key)}
                  disabled={isLoading || !!lockoutMsg}
                  className={`relative h-16 rounded-2xl font-grotesk text-2xl font-semibold flex items-center justify-center transition-all duration-150 border disabled:opacity-40 disabled:cursor-not-allowed ${
                    key === "⌫"
                      ? "bg-transparent border-transparent text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      : "surface text-white hover:border-teal-500/40 active:bg-teal-500/20"
                  }`}
                >
                  {isLoading && pin.length > 0 && key === "0" ? (
                    <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  ) : key === "⌫" ? (
                    <Delete className="w-6 h-6" />
                  ) : (
                    key
                  )}
                </motion.button>
              )
            })}
          </div>

          <p className="text-gray-600 text-xs text-center mt-6">You can also type your PIN on the keyboard</p>
        </motion.div>
      </div>
    </div>
  )
}
