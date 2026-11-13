"use client"

export default function POSLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pos-bg overflow-hidden">
      <div className="absolute w-130 h-130 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative flex items-center justify-center">
        <div className="absolute w-24 h-24 rounded-3xl border border-teal-500/30 animate-ping" />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-2xl shadow-teal-500/40 ring-1 ring-white/10"
          style={{ background: "linear-gradient(135deg, rgb(16 185 129), rgb(4 120 87))" }}
        >
          ✚
        </div>
      </div>

      <div className="relative mt-8 text-center space-y-1">
        <h2 className="text-xl font-bold font-grotesk text-white tracking-tight">AN MedCare POS</h2>
        <p className="text-sm text-gray-500">Preparing your counter…</p>
      </div>

      <div className="relative mt-6 w-48 h-1 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-linear-to-r from-teal-500 via-emerald-400 to-teal-300 animate-progress-bar" />
      </div>
    </div>
  )
}
