// PIN Authentication Library
// Stores PIN hash in Supabase settings table
// Session stored in localStorage as JWT-like token

import { supabase } from "./supabase"

const SESSION_KEY = "anmedcare_session"
const SESSION_DURATION = 12 * 60 * 60 * 1000 // 12 hours
const INACTIVITY_DURATION = 4 * 60 * 60 * 1000 // 4 hours
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 5 * 60 * 1000 // 5 minutes

interface Session {
  token: string
  createdAt: number
  lastActivity: number
  operatorName: string
}

interface LockoutState {
  attempts: number
  lockedUntil: number | null
}

// Simple hash function (salted)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`anmedcare-${pin}-pos`)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Plain hash function (for compatibility with SQL seed)
async function hashPlainPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function generateToken(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Check if session is valid
export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false

  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return false

  try {
    const session: Session = JSON.parse(raw)
    const now = Date.now()

    // Check session expiry
    if (now - session.createdAt > SESSION_DURATION) {
      localStorage.removeItem(SESSION_KEY)
      return false
    }

    // Check inactivity
    if (now - session.lastActivity > INACTIVITY_DURATION) {
      localStorage.removeItem(SESSION_KEY)
      return false
    }

    // Update last activity
    session.lastActivity = now
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return false
  }
}

// Get lockout state
function getLockoutState(): LockoutState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: null }
  const raw = localStorage.getItem("anmedcare_lockout")
  if (!raw) return { attempts: 0, lockedUntil: null }
  try {
    return JSON.parse(raw)
  } catch {
    return { attempts: 0, lockedUntil: null }
  }
}

function saveLockoutState(state: LockoutState) {
  localStorage.setItem("anmedcare_lockout", JSON.stringify(state))
}

export function resetLockout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("anmedcare_lockout")
  }
}

// Check if currently locked out
export function isLockedOut(): { locked: boolean; remainingMs: number } {
  const state = getLockoutState()
  if (!state.lockedUntil) return { locked: false, remainingMs: 0 }

  const remaining = state.lockedUntil - Date.now()
  if (remaining <= 0) {
    saveLockoutState({ attempts: 0, lockedUntil: null })
    return { locked: false, remainingMs: 0 }
  }

  return { locked: true, remainingMs: remaining }
}

// Verify PIN against Supabase
export async function verifyPin(pin: string): Promise<{
  success: boolean
  error?: string
  remainingAttempts?: number
}> {
  // Check lockout
  const lockout = isLockedOut()
  if (lockout.locked) {
    const mins = Math.ceil(lockout.remainingMs / 60000)
    return { success: false, error: `Locked out. Try again in ${mins} minute(s).` }
  }

  try {
    // Get stored PIN hash from Supabase
    const { data, error } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "pin_hash")
      .single()

    let storedHash: string

    if (error || !data) {
      // If no PIN set, use default "1234"
      storedHash = await hashPin("1234")
    } else {
      storedHash = data.value
    }

    const inputHash = await hashPin(pin)
    const plainHash = await hashPlainPin(pin)

    // Check salted hash, plain hash, plain text, or default 1234
    const isMatch =
      inputHash === storedHash ||
      plainHash === storedHash ||
      storedHash === pin ||
      (pin === "1234" &&
        (storedHash === "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4" ||
         storedHash === "148bae0beb5f365cfc71df46b8877cb78d2e95fc4f0a92ccb47febb450a7d275"))

    if (isMatch) {
      // Success — reset lockout, cache offline pin, create session
      saveLockoutState({ attempts: 0, lockedUntil: null })
      localStorage.setItem("anmedcare_offline_pin", inputHash)
      createSession()
      return { success: true }
    } else {
      // Failed — increment attempts
      const state = getLockoutState()
      const newAttempts = state.attempts + 1

      if (newAttempts >= MAX_ATTEMPTS) {
        saveLockoutState({ attempts: newAttempts, lockedUntil: Date.now() + LOCKOUT_DURATION })
        return { success: false, error: "Too many attempts. Locked for 5 minutes." }
      }

      saveLockoutState({ attempts: newAttempts, lockedUntil: null })
      return {
        success: false,
        error: "Incorrect PIN",
        remainingAttempts: MAX_ATTEMPTS - newAttempts,
      }
    }
  } catch (err) {
    // Network error — check if offline mode PIN is stored
    const offlineHash = localStorage.getItem("anmedcare_offline_pin")
    const inputHash = await hashPin(pin)
    const plainHash = await hashPlainPin(pin)

    if (offlineHash) {
      if (inputHash === offlineHash || plainHash === offlineHash) {
        saveLockoutState({ attempts: 0, lockedUntil: null })
        createSession()
        return { success: true }
      }
    } else if (pin === "1234") {
      // Fallback default for first offline boot
      saveLockoutState({ attempts: 0, lockedUntil: null })
      createSession()
      return { success: true }
    }

    return { success: false, error: "Connection error. Check your internet." }
  }
}

// Create session
function createSession() {
  const session: Session = {
    token: generateToken(),
    createdAt: Date.now(),
    lastActivity: Date.now(),
    operatorName: "Adil Nawaz",
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  if (typeof document !== "undefined") {
    document.cookie = "anmedcare_pos_auth=1; path=/; max-age=43200; SameSite=Lax"
  }
}

// Clear session (logout)
export function clearSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(SESSION_KEY)
  if (typeof document !== "undefined") {
    document.cookie = "anmedcare_pos_auth=; path=/; max-age=0"
  }
}

// Change PIN
export async function changePin(oldPin: string, newPin: string): Promise<{ success: boolean; error?: string }> {
  const result = await verifyPin(oldPin)
  if (!result.success) {
    return { success: false, error: result.error || "Incorrect current PIN" }
  }

  const newHash = await hashPin(newPin)

  // Save to Supabase
  const { error } = await supabase
    .from("settings")
    .upsert({ key: "pin_hash", value: newHash, updated_at: new Date().toISOString() })

  if (error) return { success: false, error: "Failed to save new PIN" }

  // Also save offline copy
  localStorage.setItem("anmedcare_offline_pin", newHash)

  return { success: true }
}

// Update last activity (call this on any user interaction)
export function updateActivity() {
  if (typeof window === "undefined") return
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return
  try {
    const session: Session = JSON.parse(raw)
    session.lastActivity = Date.now()
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}
