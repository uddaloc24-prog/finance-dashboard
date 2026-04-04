import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        b1: { DEFAULT: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
        b2: { DEFAULT: '#f59e0b', light: '#fffbeb', border: '#fde68a' },
        b3: { DEFAULT: '#22c55e', light: '#f0fdf4', border: '#bbf7d0' },
      },
    },
  },
  plugins: [],
} satisfies Config
