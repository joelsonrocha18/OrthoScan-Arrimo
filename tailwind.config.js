/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9fc',
          100: '#d8f2f7',
          200: '#b3e3ec',
          500: '#01527d',
          600: '#014565',
          700: '#01354d',
          900: '#001c29',
        },
        baby: {
          50: '#f4fdfe',
          100: '#dff8fb',
          200: '#b8edf3',
          300: '#84dce7',
          500: '#58c4d2',
          700: '#1d8897',
        },
        olive: {
          50: '#f6f7ef',
          100: '#e7ebd5',
          200: '#d0d9ad',
          300: '#b3c07e',
          500: '#7f8f4b',
          600: '#6b783f',
          700: '#576234',
        },
        salmon: {
          50: '#fff5f1',
          100: '#ffe0d8',
          200: '#ffc1b2',
          300: '#f4a18d',
          500: '#e88774',
          600: '#d36e5f',
          700: '#b5584b',
        },
      },
    },
  },
  plugins: [],
}
