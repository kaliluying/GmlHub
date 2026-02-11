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
          light: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(30, 30, 30, 0.7)',
          border: 'rgba(255, 255, 255, 0.3)',
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
  darkMode: 'class',
}
