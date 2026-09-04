"use client"

export default function POSLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pos-bg">
      <div className="relative flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-teal-500/20 animate-ping absolute inset-0 m-auto" />
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-xl shadow-teal-500/30"
          style={{
            background: "linear-gradient(135deg, rgb(16 185 129), rgb(5 150 105))",
          }}
        >
          ✚
        </div>
      </div>
      <div className="mt-6 text-center space-y-1">
        <h2 className="text-lg font-bold font-grotesk text-white tracking-wide">
          AN MedCare POS
        </h2>
        <p className="text-xs text-gray-400 font-sans">
          Loading catalog & offline database...
        </p>
      </div>
      <div className="mt-8 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 rounded-full bg-teal-400 animate-bounce" />
      </div>
    </div>
  )
}
