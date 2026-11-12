import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vurgu renkleri GSAP ile tweenlenen CSS değişkenlerinden gelir
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        accent2: 'rgb(var(--accent-2-rgb) / <alpha-value>)',
        bg0: '#05070D',
        bg1: '#0B1220',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        display: ['clamp(3rem, 9vw, 9rem)', { lineHeight: '0.95', letterSpacing: '-0.045em' }],
        headline: ['clamp(2.25rem, 5.5vw, 5.5rem)', { lineHeight: '1', letterSpacing: '-0.035em' }],
      },
      boxShadow: {
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 20px 60px -20px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config;
