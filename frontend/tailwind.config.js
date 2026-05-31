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
          bg: '#090d16',        // Deep Space Black
          card: '#111625',      // Sleek Charcoal Card
          border: '#1e293b',    // Fine Slate Border
          primary: '#3b82f6',   // High-Fidelity Blue
          accent: '#6366f1',    // Cyber Indigo
          success: '#10b981',   // Threat Safe Green
          warning: '#f59e0b',   // Threat Medium Orange
          danger: '#ef4444',    // Threat Critical Red
          info: '#06b6d4',      // Info Cyan
          muted: '#64748b'      // Slate Gray Muted
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
