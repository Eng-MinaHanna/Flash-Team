/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './app.js'],
  theme: {
    extend: {
      colors: {
        'brand': { DEFAULT: '#1978e5', dark: '#0e141b' }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
}
