/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bimfli: {
          mint: '#65E0D4',
          navy: '#0A365C',
          pink: '#EC2772',
          blue: '#2B8AFA',
        }
      }
    },
  },
  plugins: [],
}