/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Neural palette. Legacy token names kept so shared components
        // (e.g. the chat widget) re-skin in place:
        //   blush = dark surfaces · pink = synapse cyan · rose = copper ·
        //   plum = light bone text (inverted for the dark theme)
        blush: {
          50: "#faf7f1",
          100: "#f2eee5",
          200: "#e4ddd0",
          300: "#d0c6b4",
          400: "#a89a82",
        },
        pink: {
          DEFAULT: "#a4622e",
          50: "#f7ede1",
          100: "#efdcc6",
          200: "#dfc09a",
          300: "#c99c66",
          400: "#c98a4f",
          500: "#a4622e",
          600: "#8a4f22",
          700: "#6e3d18",
        },
        rose: {
          DEFAULT: "#d98a4a",
          400: "#ffb070",
          500: "#d98a4a",
          700: "#a4622e",
        },
        plum: {
          DEFAULT: "#4a4438",
          700: "#2b2620",
          900: "#1c1a17",
        },
        bone: "#e8e4dc",
        synapse: "#37d6f5",
        copper: "#d98a4a",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: ["\"Fraunces\"", "Georgia", "serif"],
        mono: ["\"IBM Plex Mono\"", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
