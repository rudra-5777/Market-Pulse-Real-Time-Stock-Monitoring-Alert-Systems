/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      keyframes: {
        flashGreen: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '30%': { backgroundColor: 'rgba(34,197,94,0.35)' },
          '60%': { backgroundColor: 'rgba(34,197,94,0.15)' },
        },
        flashRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '30%': { backgroundColor: 'rgba(239,68,68,0.35)' },
          '60%': { backgroundColor: 'rgba(239,68,68,0.15)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'flash-green': 'flashGreen 0.8s ease-out',
        'flash-red':   'flashRed 0.8s ease-out',
        'slide-in':    'slideIn 0.25s ease-out',
        'fade-in':     'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
