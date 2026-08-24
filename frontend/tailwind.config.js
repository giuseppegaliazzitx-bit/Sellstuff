/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        header: "#4A2C1F",
        gold: "#C45C26",
        "gold-hover": "#A84B1E",
        page: "#F8F1E7",
        chip: "#EFE3D4",
        card: "#FFFAF3",
      },
      fontFamily: {
        sans: ['"Nunito Sans"', "system-ui", "sans-serif"],
        display: ['Fraunces', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
