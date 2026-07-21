/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: '#000000',
          900: '#080c18',
          800: '#0d1326',
          700: '#141d38',
          600: '#1a2744',
          500: '#1e3a5f',
        },
        overseerr: {
          indigo: '#6366f1',
          purple: '#a855f7',
        },
      },
    },
  },
  plugins: [],
}