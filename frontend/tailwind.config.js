/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#000000',        // Pure Black
          card: '#0a0a0c',      // Dark Graphite Panel
          border: '#141418',    // Fine Graphite Border
          primary: '#00ff66',   // High-Fidelity Neon Green
          accent: '#39ff14',    // Bright Neon Green Accent
          success: '#00ff66',   // Safe
          warning: '#f59e0b',   // Warning
          danger: '#ef4444',    // Danger
          info: '#00e5ff',      // Info
          muted: '#71717a'      // Zinc Gray Muted
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}
