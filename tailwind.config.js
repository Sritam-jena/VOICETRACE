/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "#27272a",
        input: "#27272a",
        ring: "#d4d4d8",
        background: "#09090b",
        foreground: "#fafafa",
        primary: {
          DEFAULT: "#fafafa",
          foreground: "#09090b",
        },
        secondary: {
          DEFAULT: "#18181b",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#18181b",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#27272a",
          foreground: "#fafafa",
        },
        card: {
          DEFAULT: "#0d0d10",
          foreground: "#fafafa",
        },
        rime: {
          cyan: "#00F0FF",
          aqua: "#2CC3E9",
          electric: "#00E5FF",
          glow: "rgba(44, 195, 233, 0.4)",
          dark: "#09090b",
          surface: "#0e0e12",
          card: "#121217",
          border: "#1e1e26",
          emerald: "#10B981",
        },
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"San Francisco"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "SFMono-Regular",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      keyframes: {
        "eq-1": {
          "0%, 100%": { height: "25%" },
          "50%": { height: "100%" },
        },
        "eq-2": {
          "0%, 100%": { height: "70%" },
          "50%": { height: "30%" },
        },
        "eq-3": {
          "0%, 100%": { height: "40%" },
          "50%": { height: "85%" },
        },
        "eq-4": {
          "0%, 100%": { height: "90%" },
          "50%": { height: "20%" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.03)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "eq-1": "eq-1 0.75s ease-in-out infinite",
        "eq-2": "eq-2 0.55s ease-in-out infinite",
        "eq-3": "eq-3 0.85s ease-in-out infinite",
        "eq-4": "eq-4 0.65s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
