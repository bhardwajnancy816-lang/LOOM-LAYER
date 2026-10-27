/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          25: '#fffdf9',
          50: '#fdfbf7',
          100: '#faf6f0',
          200: '#f4ede2',
          300: '#e9dfd0',
          400: '#d7c7b2',
          500: '#beaa92',
          600: '#a38d74',
          700: '#86725c',
          800: '#6d5c4a',
          900: '#56493b',
          950: '#2f271f',
        },
        crimson: {
          50: '#fdf3f3',
          100: '#fbe6e6',
          200: '#f8d0d0',
          300: '#f1adad',
          400: '#e57a7a',
          500: '#d24848',
          600: '#b83232',
          700: '#9b2424',
          800: '#812121',
          900: '#6c1f1f',
          950: '#3c0c0c',
        },
        terracotta: {
          50: '#fdf5f3',
          100: '#fae9e4',
          200: '#f5d6cc',
          300: '#ecbaa9',
          400: '#e0957d',
          500: '#d47153',
          600: '#c25537',
          700: '#a34229',
          800: '#863825',
          900: '#6f3223',
        },
        atelier: {
          50: '#faf8f5',
          100: '#f3eee6',
          200: '#e6dccf',
          300: '#d5c3af',
          400: '#c0a68d',
          500: '#ab8d70',
          600: '#9b7b5f',
          700: '#7f634d',
          800: '#685140',
          900: '#2c221e',
          950: '#1b1411',
        },
        basting: {
          gold: '#c28e3a',
          thread: '#d4a373',
        }
      },
      fontFamily: {
        serif: ['"Fraunces"', '"Newsreader"', 'Georgia', 'serif'],
        display: ['"Fraunces"', '"Newsreader"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        'cloth': '0 1px 3px rgba(44, 34, 30, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
        'cloth-inset': 'inset 0 1px 3px rgba(44, 34, 30, 0.12)',
        'cloth-pressed': '0 0 0 1px rgba(155, 36, 36, 0.3), inset 0 2px 4px rgba(44, 34, 30, 0.2)',
      },
      animation: {
        'laser-scan': 'laserScan 3s linear infinite',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
        'dash-flow': 'dashFlow 1.5s linear infinite',
      },
      keyframes: {
        laserScan: {
          '0%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0%)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        dashFlow: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}
