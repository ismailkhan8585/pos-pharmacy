const config: Record<string, any> = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    "bg-green-500/20", "text-green-400", "border-green-500",
    "bg-red-500/20", "text-red-400", "border-red-500",
    "bg-amber-500/20", "text-amber-400", "border-amber-500",
    "bg-teal-500/20", "text-teal-400", "border-teal-500",
    "bg-blue-500/20", "text-blue-400", "border-blue-500",
    "bg-orange-500/20", "text-orange-400",
    "bg-purple-500/20", "text-purple-400",
  ],
  theme: {
    extend: {
      colors: {
        pos: {
          bg: "rgb(8 10 14)",
          panel: "rgb(11 13 18)",
          bill: "rgb(13 16 22)",
          card: "rgb(19 22 29)",
          cardHover: "rgb(25 29 38)",
          modal: "rgb(16 19 26)",
          border: "rgb(32 36 46)",
          borderHi: "rgb(50 56 70)",
        },
        teal: {
          50: "rgb(236 253 248)",
          100: "rgb(204 250 236)",
          200: "rgb(153 245 214)",
          300: "rgb(94 234 187)",
          400: "rgb(45 212 162)",
          500: "rgb(16 185 129)",
          600: "rgb(5 150 105)",
          700: "rgb(4 120 87)",
          800: "rgb(6 95 70)",
          900: "rgb(6 78 59)",
        },
        orange: {
          400: "rgb(251 146 60)",
          500: "rgb(249 115 22)",
          600: "rgb(234 88 12)",
        },
        amber: {
          400: "rgb(251 191 36)",
          500: "rgb(245 158 11)",
        },
        text: {
          primary: "rgb(250 250 250)",
          secondary: "rgb(156 163 175)",
          muted: "rgb(75 85 99)",
          disabled: "rgb(55 65 81)",
        },
        green: { 400: "rgb(74 222 128)", 500: "rgb(34 197 94)" },
        red: { 400: "rgb(248 113 113)", 500: "rgb(239 68 68)" },
        blue: { 400: "rgb(96 165 250)", 500: "rgb(59 130 246)" },
        purple: { 400: "rgb(192 132 252)", 500: "rgb(168 85 247)" },
      },
      fontFamily: {
        grotesk: ["Space Grotesk", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        urdu: ["Noto Nastaliq Urdu", "serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease",
        "slide-up": "slideUp 0.25s ease",
        "scale-in": "scaleIn 0.15s ease",
        "pulse-slow": "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        scaleIn: { from: { transform: "scale(0.95)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
