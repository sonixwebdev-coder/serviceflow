/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'viperx-primary': '#2563EB',
        'viperx-secondary': '#1e293b',
        'viperx-accent': '#059669',
      },
    },
  },
  plugins: [],
}