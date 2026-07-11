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
          bg: '#04060e',        // Premium Obsidian Navy
          card: '#0a0e1a',      // Rich Dark Console Panel
          border: '#161d30',    // Slate Border
          primary: '#00ff9d',   // High-Fidelity Cyber Mint Green
          accent: '#00f0ff',    // Cyber Neon Cyan Accent
          success: '#10b981',   // Safe/Clean Ingestions
          warning: '#f59e0b',   // Warning Alert State
          danger: '#f43f5e',    // Rose/Red Critical State
          info: '#0ea5e9',      // Informational Signal
          muted: '#64748b'      // Slate Gray Muted
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'Outfit', 'sans-serif']
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(0, 255, 157, 0.15)',
        'glow-cyan': '0 0 20px rgba(0, 240, 255, 0.15)',
        'glow-red': '0 0 20px rgba(244, 63, 94, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    },
  },
  plugins: [],
}
