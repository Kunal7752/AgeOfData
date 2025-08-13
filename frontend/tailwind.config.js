/** @type {import('tailwindcss').Config} */
export default {
  content: [
   "./index.html",           // your Vite entrypoint
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: [
      "light",
      "dark", 
      "cyberpunk",
      "synthwave",
      "forest",
      "aqua"
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}