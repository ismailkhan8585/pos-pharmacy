"use client"

import { useEffect, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, type LucideIcon } from "lucide-react"

/* ────────────────────────────────────────────────────────────────────────────
 * Shared premium UI primitives — used across POS dialogs and management pages
 * ──────────────────────────────────────────────────────────────────────────── */

type Tone = "teal" | "amber" | "sky" | "red" | "purple" | "gray"

const TONE: Record<Tone, { icon: string; glow: string }> = {
  teal: { icon: "bg-teal-500/15 text-teal-300 border-teal-500/25", glow: "bg-teal-500/20" },
  amber: { icon: "bg-amber-500/15 text-amber-300 border-amber-500/25", glow: "bg-amber-500/20" },
  sky: { icon: "bg-sky-500/15 text-sky-300 border-sky-500/25", glow: "bg-sky-500/20" },
  red: { icon: "bg-red-500/15 text-red-300 border-red-500/25", glow: "bg-red-500/20" },
  purple: { icon: "bg-purple-500/15 text-purple-300 border-purple-500/25", glow: "bg-purple-500/20" },
  gray: { icon: "bg-white/5 text-gray-300 border-white/10", glow: "bg-white/5" },
}

/* ─── Modal ─────────────────────────────────────────────────────────────── */
interface ModalProps {
  isOpen: boolean
  onClose?: () => void
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  tone?: Tone
  size?: "sm" | "md" | "lg" | "xl"
  dismissible?: boolean
  headerExtra?: ReactNode
  footer?: ReactNode
  children: ReactNode
}

const SIZE = { sm: "max-w-100", md: "max-w-120", lg: "max-w-160", xl: "max-w-205" }

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = "teal",
  size = "md",
  dismissible = true,
  headerExtra,
  footer,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen || !dismissible || !onClose) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [isOpen, dismissible, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          onClick={(e) => dismissible && onClose && e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 14 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className={`glass border border-pos-borderHi rounded-3xl w-full ${SIZE[size]} max-h-[92vh] overflow-hidden flex flex-col`}
          >
            <div className="relative flex items-center gap-3 px-6 h-17 border-b border-pos-border shrink-0 overflow-hidden">
              <div className={`absolute -top-16 -left-10 w-48 h-32 rounded-full blur-3xl pointer-events-none ${TONE[tone].glow}`} />
              {Icon && (
                <div className={`relative w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${TONE[tone].icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="relative flex-1 min-w-0">
                <h3 className="font-grotesk font-bold text-white text-[17px] leading-tight truncate">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>}
              </div>
              {headerExtra}
              {dismissible && onClose && (
                <button
                  onClick={onClose}
                  className="relative flex items-center gap-2 h-9 px-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all text-xs"
                  title="Close (Esc)"
                >
                  <span className="kbd hidden sm:inline-flex">Esc</span>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
            {footer && <div className="px-6 py-4 border-t border-pos-border shrink-0 bg-pos-bg/40">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Segmented tabs ────────────────────────────────────────────────────── */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode; badge?: ReactNode }[]
  className?: string
}) {
  return (
    <div className={`flex p-1 rounded-xl bg-pos-bg border border-pos-border ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-xs font-semibold transition-all ${
              active ? "bg-pos-cardHover text-white shadow-md shadow-black/30 ring-1 ring-white/5" : "text-gray-500 hover:text-gray-200"
            }`}
          >
            {o.label}
            {o.badge}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Page header (management pages) ────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: LucideIcon
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/10">
            <Icon className="w-5 h-5 text-teal-300" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="font-grotesk font-bold text-2xl text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "teal",
}: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: Tone
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl surface p-4">
      <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl pointer-events-none ${TONE[tone].glow}`} />
      <div className="relative flex items-start justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${TONE[tone].icon}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className="relative font-mono text-2xl font-bold text-white mt-2 tabular">{value}</p>
      {hint && <p className="relative text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

/* ─── Empty state ───────────────────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-3">
      <div className="relative">
        <div className="absolute inset-0 rounded-3xl bg-teal-500/10 blur-xl" />
        <div className="relative w-14 h-14 rounded-2xl surface flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-500" />
        </div>
      </div>
      <p className="text-gray-200 text-sm font-semibold">{title}</p>
      {description && <p className="text-gray-500 text-xs max-w-xs leading-relaxed">{description}</p>}
      {action}
    </div>
  )
}

/* ─── Field label ───────────────────────────────────────────────────────── */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.14em] text-gray-500 font-semibold mb-2">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500 mt-1.5">{hint}</span>}
    </label>
  )
}

export const inputCls =
  "w-full h-11 px-3.5 bg-pos-bg border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 outline-none focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/10 transition-all"

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-emerald-500 to-teal-600 hover:brightness-110 shadow-[0_10px_28px_-10px_rgba(16,185,129,0.7)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium text-gray-200 bg-pos-card border border-pos-border hover:border-pos-borderHi hover:text-white transition-all active:scale-[0.98] disabled:opacity-40"
