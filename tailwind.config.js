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
          50: "#0a0d12",
          100: "#0e1218",
          200: "#1a2230",
          300: "#2a3547",
          400: "#3d4a61",
        },
        pink: {
          DEFAULT: "#37d6f5",
          50: "#062028",
          100: "#0a2e3a",
          200: "#0f4152",
          300: "#17607a",
          400: "#7be9ff",
          500: "#37d6f5",
          600: "#22b8d8",
          700: "#1a92ad",
        },
        rose: {
          DEFAULT: "#d98a4a",
          400: "#ffb070",
          500: "#d98a4a",
          700: "#a4622e",
        },
        plum: {
          DEFAULT: "#c6cbd8",
          700: "#e8e4dc",
          900: "#f4f1ea",
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
