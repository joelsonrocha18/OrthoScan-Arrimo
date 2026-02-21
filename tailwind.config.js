/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f8ff',
          100: '#e7f0ff',
          500: '#3478f6',
          700: '#1d55c9',
        },
      },
    },
  },
  plugins: [],
}
