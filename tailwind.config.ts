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
      // ─── TYPOGRAPHY ────────────────────────────────
      fontFamily: {
        sans:    ['var(--font-outfit)', 'system-ui', 'sans-serif'],
        display: ['var(--font-space)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
      },

      // ─── COLORS ────────────────────────────────────
      colors: {
        // Surfaces
        bg:      '#FAFAFA',
        surface: '#FFFFFF',
        // Borders
        border: {
          DEFAULT: '#EBEBEB',
          strong:  '#D4D4D4',
          focus:   '#111111',
        },
        // Text
        ink: {
          DEFAULT: '#111111',
          muted:   '#888888',
          faint:   '#BBBBBB',
        },
        // Brand
        red: {
          DEFAULT: '#E03020',
          light:   '#FFF0EE',
          border:  '#FFD8D0',
          hover:   '#C82010',
        },
        // Semantic
        green: {
          DEFAULT: '#2E9E6A',
          light:   '#F0FFF6',
          border:  '#AAEEC8',
        },
        // TCG Signal tiers
        tier: {
          s:      '#FFD700',
          s_bg:   '#FFFDE0',
          a:      '#C855D4',
          a_bg:   '#F5EAFF',
          b:      '#2E9E6A',
          b_bg:   '#F0FFF6',
        },
        // TCG Type energy colors
        energy: {
          fire:     '#FF6B35',
          water:    '#42A5F5',
          psychic:  '#C855D4',
          dark:     '#7E57C2',
          electric: '#FFD700',
          grass:    '#66BB6A',
          fighting: '#EF5350',
          steel:    '#90A4AE',
        },
      },

      // ─── SPACING ───────────────────────────────────
      borderRadius: {
        DEFAULT: '8px',
        sm:      '4px',
        md:      '8px',
        lg:      '12px',
        xl:      '16px',
        '2xl':   '20px',
        full:    '9999px',
      },

      // ─── SHADOWS ───────────────────────────────────
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        raised:  '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        signal:  '0 4px 20px rgba(224,48,32,0.08)',
        tier_s:  '0 2px 10px rgba(255,215,0,0.35)',
        focus:   '0 0 0 2px #111111',
        none:    'none',
      },

      // ─── ANIMATIONS ────────────────────────────────
      animation: {
        'ticker':      'ticker 30s linear infinite',
        'float':       'float 3s ease-in-out infinite',
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
        'blink':       'blink 2.5s ease-in-out infinite',
      },
      keyframes: {
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-4px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.6' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.2' },
        },
      },
    },
  },
  plugins: [],
}

export default config