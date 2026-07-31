/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50:'#f5f0e8', 100:'#e8ddd0', 500:'#7A5240', 600:'#4A2C2A', 700:'#3A2020', 900:'#2A1510' },
        cr: { red: '#E3051B', light: '#fef2f2' }
      }
    }
  },
  plugins: []
}
