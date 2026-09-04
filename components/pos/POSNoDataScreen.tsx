"use client"

import { AlertTriangle, RefreshCw, Wifi, Database, Sparkles, FileText } from "lucide-react"

interface POSNoDataScreenProps {
  onRetry: () => void
  onLoadSampleCatalog?: () => void
  isRetrying?: boolean
  isPlaceholderConfig?: boolean
}

export default function POSNoDataScreen({
  onRetry,
  onLoadSampleCatalog,
  isRetrying = false,
  isPlaceholderConfig = true,
}: POSNoDataScreenProps) {
  const isBrowserOnline = typeof navigator !== "undefined" ? navigator.onLine : true

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#111115] p-6 text-white overflow-y-auto">
      <div className="max-w-md w-full bg-[#1A1A22] border border-[#2E2E3E] rounded-3xl p-7 text-center space-y-5 shadow-2xl my-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-grotesk text-white">
            {isPlaceholderConfig ? "Supabase Not Connected Yet" : "Cannot Start Offline"}
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            {isBrowserOnline ? (
              <span>
                Your laptop is online, but the POS cannot reach your Supabase database because{" "}
                <span className="font-mono text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded">.env.local</span>{" "}
                still has placeholder credentials (<span className="font-mono text-gray-400">YOUR_PROJECT_ID</span>).
              </span>
            ) : (
              <span>
                Connect to WiFi or counter hotspot to download your medicine catalog from Supabase for the first launch.
              </span>
            )}
          </p>
        </div>

        {/* Network & Cloud Status Pill */}
        <div className="bg-[#14141B] border border-[#2A2A38] rounded-2xl p-3.5 space-y-2 text-left text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className={`w-4 h-4 ${isBrowserOnline ? "text-emerald-400" : "text-amber-400"}`} />
              <span className="text-gray-300">Laptop Network:</span>
            </div>
            <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
              isBrowserOnline ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}>
              {isBrowserOnline ? "🟢 Online" : "🟡 Offline"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span className="text-gray-300">Supabase Cloud DB:</span>
            </div>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Not Connected
            </span>
          </div>
        </div>

        {/* Action 1: Instant Start with 20 Sample Medicines */}
        {onLoadSampleCatalog && (
          <div className="pt-1">
            <button
              onClick={onLoadSampleCatalog}
              disabled={isRetrying}
              className="w-full h-12 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Load 20 Sample Medicines (Start Offline POS Now)</span>
            </button>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Preloads Panadol, Augmentin, Risek, Brufen & more into local IndexedDB so you can test right away!
            </p>
          </div>
        )}

        {/* Action 2: Retry Connection */}
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="w-full h-11 rounded-xl bg-[#242430] hover:bg-[#2C2C3C] border border-[#3A3A4C] text-gray-200 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
          <span>{isRetrying ? "Connecting to Supabase..." : "Retry Supabase Cloud Connection"}</span>
        </button>

        {/* Help instructions */}
        <div className="bg-[#13131A] border border-[#262634] rounded-xl p-3 text-left">
          <div className="flex items-center gap-1.5 text-teal-400 text-[11px] font-semibold mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>How to connect your real Supabase DB:</span>
          </div>
          <ol className="text-[10px] text-gray-400 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Run the SQL script in <span className="text-gray-200 font-mono">SQL_SCHEMA.sql</span> in your Supabase SQL editor</li>
            <li>Open <span className="text-gray-200 font-mono">.env.local</span> and paste your Project URL and Anon Key</li>
            <li>Restart <span className="text-gray-200 font-mono">npm run dev</span> and click Retry above</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
