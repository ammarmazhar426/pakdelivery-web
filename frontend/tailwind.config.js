/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pk: {
          green:  '#00C566',
          green2: '#34D399',
        },
        dark: {
          900: '#080C14',
          800: '#0D1117',
          700: '#111827',
          600: '#1A2235',
          500: '#1C2A40',
          400: '#243044',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'ios': '14px',
        'ios-lg': '20px',
      }
    },
  },
  plugins: [],
}
