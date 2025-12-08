/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pepper: {
          red: '#D32F2F',
          'red-dark': '#C62828',
          orange: '#E64A19',
        },
        neutral: {
          dark: '#424242',
          light: '#F5F5F5',
        },
        status: {
          success: '#4CAF50',
          warning: '#FFC107',
          error: '#F44336',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
