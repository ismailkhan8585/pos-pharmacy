"use client"

import { useRef, useEffect, useState } from "react"
import { Search, ScanBarcode, X, CornerDownLeft } from "lucide-react"
import { usePOSProductsStore } from "@/stores/pos-products"
import { usePOSCartStore } from "@/stores/pos-cart"
import { debounce } from "@/lib/pos-helpers"
import toast from "react-hot-toast"

interface Props {
  onBarcodeClick: () => void
}

/** Fire this event anywhere to put the cursor back in the search box. */
export const FOCUS_SEARCH_EVENT = "pos:focus-search"

function isTypingTarget(el: Element | null) {
  if (!el) return false
  const tag = el.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable
}

export default function ProductSearch({ onBarcodeClick }: Props) {
  const setSearch = usePOSProductsStore((s) => s.setSearch)
  const searchQuery = usePOSProductsStore((s) => s.searchQuery)
  const addItem = usePOSCartStore((s) => s.addItem)
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(searchQuery)

  const debouncedSearch = useRef(debounce((q: string) => setSearch(q), 150)).current

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    debouncedSearch(e.target.value)
  }

  const reset = () => {
    setLocalValue("")
    setSearch("")
    inputRef.current?.focus()
  }

  // Enter → add exact barcode / SKU match, or the only matching product.
  // USB barcode scanners type the code followed by Enter, so this makes them work out of the box.
  const handleEnter = () => {
    const q = localValue.trim()
    if (!q) return
    const store = usePOSProductsStore.getState()
    const lower = q.toLowerCase()

    let product =
      store.products.find((p) => p.barcode === q) ||
      store.products.find((p) => (p.sku || "").toLowerCase() === lower) ||
      null

    if (!product) {
      setSearch(q) // apply immediately (skip debounce)
      const matches = usePOSProductsStore.getState().getFilteredProducts()
      if (matches.length === 1) product = matches[0]
      else if (matches.length === 0) {
        toast.error(`No product matches "${q}"`)
        return
      } else {
        toast(`${matches.length} matches — tap the one you want`, { icon: "🔎" })
        return
      }
    }

    const result = addItem(product)
    if (result === "added") {
      toast.success(`${product.nameEn} added`, { duration: 1200 })
      reset()
    } else if (result === "out_of_stock") {
      toast.error(`${product.nameEn} is out of stock`)
    } else {
      toast.error(`Only ${product.stock} in stock for ${product.nameEn}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleEnter()
    } else if (e.key === "Escape") {
      if (localValue) reset()
      else inputRef.current?.blur()
    }
  }

  // Focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // "/" or F2 to focus search, plus programmatic focus requests
  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "F2" || (e.key === "/" && !isTypingTarget(document.activeElement))) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    const focusHandler = () => inputRef.current?.focus()
    window.addEventListener("keydown", keyHandler)
    window.addEventListener(FOCUS_SEARCH_EVENT, focusHandler)
    return () => {
      window.removeEventListener("keydown", keyHandler)
      window.removeEventListener(FOCUS_SEARCH_EVENT, focusHandler)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-3 shrink-0">
      <div className="relative flex-1 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500 group-focus-within:text-teal-400 transition-colors pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Search medicine, brand, or scan a barcode…"
          autoComplete="off"
          spellCheck={false}
          className="w-full h-12 pl-11 pr-28 bg-pos-card border border-pos-border rounded-2xl text-[15px] text-white placeholder-gray-500 shadow-inner shadow-black/20 focus:border-teal-500/60 focus:ring-4 focus:ring-teal-500/10 transition-all duration-150 outline-none"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {localValue ? (
            <>
              <span className="hidden lg:flex items-center gap-1 text-[10px] text-gray-500">
                <CornerDownLeft className="w-3 h-3" /> add
              </span>
              <button
                onClick={reset}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                title="Clear (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <span className="hidden sm:flex items-center gap-1">
              <span className="kbd">/</span>
              <span className="kbd">F2</span>
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onBarcodeClick}
        className="h-12 px-4 shrink-0 flex items-center gap-2 bg-pos-card border border-pos-border rounded-2xl text-gray-300 hover:text-teal-300 hover:border-teal-500/40 hover:bg-teal-500/10 transition-all duration-150 text-sm font-medium"
        title="Scan barcode with camera"
      >
        <ScanBarcode className="w-5 h-5" />
        <span className="hidden lg:inline">Scan</span>
      </button>
    </div>
  )
}
