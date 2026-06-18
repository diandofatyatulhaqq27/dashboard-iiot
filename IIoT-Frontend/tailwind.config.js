/** @type {import('tailwindcss').Config} */
module.exports = {
  // 🌟 MANTRA KUNCI BARU: Tempatkan di sini agar Tailwind mendeteksi class "dark"
  darkMode: 'class', 

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Baris WAJIB untuk Flowbite:
    "./node_modules/flowbite-react/lib/esm/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    // Mengaktifkan plugin Flowbite:
    require("flowbite/plugin"),
  ],
};