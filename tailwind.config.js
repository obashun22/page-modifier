/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'github-blue': {
          DEFAULT: '#0969da',
          50: '#ddf4ff',
          100: '#b6e3ff',
          200: '#80ccff',
          300: '#54aeff',
          400: '#218bff',
          500: '#0969da',
          600: '#0550ae',
          700: '#033d8b',
          800: '#0a3069',
          900: '#002155',
        },
      },
    },
  },
  plugins: [],
}
