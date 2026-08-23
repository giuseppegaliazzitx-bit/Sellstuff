/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        header: "#2B2B2B",
        gold: "#C0985C",
        "gold-hover": "#A8844E",
        page: "#F7F6F3",
        chip: "#F1EEE8",
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', "Source Sans 3", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
