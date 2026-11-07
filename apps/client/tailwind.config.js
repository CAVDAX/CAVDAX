/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'pro-27': { 'raw': '(min-width: 1440px) and (min-height: 960px)' },
      },
      colors: {
        obsidian: {
          900: '#060709',
          800: '#0B0D11',
          700: '#12161E',
          600: '#1B212D'
        },
        cyber: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          ruby: '#F43F5E',
          amber: '#F59E0B',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
