/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tông màu Cà phê & Trà đặc sản cao cấp
        brew: {
          50: '#fcf8f2',
          100: '#f7edde',
          200: '#eddbc0',
          300: '#dec29a',
          400: '#cca06e',
          500: '#b88247',
          600: '#9c6633',
          700: '#7e4d26',
          800: '#5e361b',
          900: '#422413',
          950: '#261309',
        },
        coffee: {
          50: '#fdfbf7',
          100: '#f7f2ea',
          200: '#ede1d1',
          300: '#ddc7ab',
          400: '#c5a37d',
          500: '#a87e53',
          600: '#8c613c',
          700: '#6f4a2d',
          800: '#533621',
          900: '#382215',
          950: '#1f120a',
        },
        caramel: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
    },
  },
  plugins: [],
};
