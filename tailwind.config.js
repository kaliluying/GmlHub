/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          dark: 'rgba(30, 30, 30, 0.7)',
          border: 'rgba(255, 255, 255, 0.3)',
        },
        hud: {
          void: 'var(--hud-void)',
          surface: 'var(--hud-surface)',
          cyan: 'var(--hud-cyan)',
          amber: 'var(--hud-amber)',
          green: 'var(--hud-green)',
          red: 'var(--hud-red)',
          text: 'var(--hud-text)',
          muted: 'var(--hud-muted)',
          line: 'var(--hud-line)',
          'line-strong': 'var(--hud-line-strong)',
        },
        app: {
          tools: '#FF9500',
          wiki: '#007AFF',
          vault: '#34C759',
          blog: '#AF52DE',
          gallery: '#FF2D55',
          dashboard: '#5AC8FA',
          settings: '#8E8E93',
          terminal: '#000000',
        }
      },
      backdropBlur: {
        glass: '20px',
      },
      borderRadius: {
        hud: 'var(--radius-card)',
        'hud-inner': 'var(--radius-inner)',
      },
      boxShadow: {
        'hud-card': 'var(--shadow-card)',
        'hud-glow': '0 0 0 1px rgba(125, 211, 252, 0.25) inset, 0 0 22px rgba(56, 189, 248, 0.14)',
      },
      transitionTimingFunction: {
        hud: 'var(--ease-hud)',
      },
      animation: {
        'bounce-short': 'bounce-short 0.3s ease-in-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'bounce-short': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
