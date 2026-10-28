/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf8',
          100: '#d6faed',
          200: '#b0f3dd',
          300: '#7ce7c7',
          400: '#45d3ad',
          500: '#16d8aa',
          600: '#0fa884',
          700: '#10866b',
          800: '#116a57',
          900: '#105748',
        },
        surface: {
          900: '#0b0e13',
          800: '#121721',
          700: '#1a2130',
          600: '#242e42',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
};
