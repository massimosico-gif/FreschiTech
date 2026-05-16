/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#E30613',
          hover: '#C20510',
          glow: 'rgba(227, 6, 19, 0.3)',
        }
      }
    },
  },
  plugins: [],
}
