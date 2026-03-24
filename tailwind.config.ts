import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs principales — seront affinées en Phase DA
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          400: '#7F77DD',
          600: '#534AB7',
          800: '#3C3489',
          900: '#26215C',
        },
        surface: {
          // Dark terminal base
          bg:      '#0D0E14',
          card:    '#13141C',
          border:  '#1F2133',
          hover:   '#1A1B27',
        },
        signal: {
          s: '#EF9F27',  // Tier S — Or
          a: '#7F77DD',  // Tier A — Violet
          b: '#1D9E75',  // Tier B — Vert
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      fontSize: {
        'ticker': ['13px', { lineHeight: '1', letterSpacing: '0.02em' }],
      },
      animation: {
        'ticker-scroll': 'ticker 30s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}

export default config