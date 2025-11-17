/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"SF Pro Display"', '"Helvetica Neue"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        'serif': ['"SF Pro Display"', '"Helvetica Neue"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        'display': ['"SF Pro Display"', '"Helvetica Neue"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'ultralight': '200',
        'light': '300',
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      letterSpacing: {
        'altivum': '0.02em',
      },
      colors: {
        'altivum': {
          'dark': '#0A0F1C',
          'navy': '#1A2332',
          'blue': '#2E4A6B',
          'slate': '#4A5A73',
          'silver': '#9BA6B8',
          'gold': '#C5A572',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'nav-fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 1.2s ease-out forwards',
        'nav-fade-in': 'nav-fade-in 0.8s ease-out 2s forwards',
      },
    },
  },
  plugins: [],
}
