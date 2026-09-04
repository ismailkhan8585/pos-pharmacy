"use client"

import { useRef, useEffect, useState } from "react"
import { Search, Camera, X } from "lucide-react"
import { usePOSProductsStore } from "@/stores/pos-products"
import { debounce } from "@/lib/pos-helpers"

interface Props {
  onBarcodeClick: () => void
}

export default function ProductSearch({ onBarcodeClick }: Props) {
  const { searchQuery, setSearch } = usePOSProductsStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localValue, setLocalValue] = useState(searchQuery)

  // Debounced search
  const debouncedSearch = useRef(
    debounce((q: string) => {
      setSearch(q)
    }, 200)
  ).current

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
    debouncedSearch(e.target.value)
  }

  const handleClear = () => {
    setLocalValue("")
    setSearch("")
    inputRef.current?.focus()
  }

  // Focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcut (/) to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-pos-border">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder="Search medicine, brand, barcode… (/)"
          className="w-full h-10 pl-9 pr-9 bg-pos-card border border-pos-border rounded-xl text-sm text-white placeholder-gray-600 focus:border-teal-500/50 focus:bg-pos-cardHover transition-all duration-150 outline-none"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Barcode Scanner Button */}
      <button
        onClick={onBarcodeClick}
        className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-pos-card border border-pos-border rounded-xl text-gray-500 hover:text-teal-400 hover:border-teal-500/40 hover:bg-teal-500/10 transition-all duration-150"
        title="Scan Barcode"
      >
        <Camera className="w-4 h-4" />
      </button>
    </div>
  )
}
