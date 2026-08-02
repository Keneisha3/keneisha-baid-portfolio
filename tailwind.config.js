/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#f7f7f7",
          100: "#f0f0f0",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
        },
        pink: {
          DEFAULT: "#111111",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#111111",
          600: "#1f1f1f",
          700: "#000000",
        },
        rose: {
          DEFAULT: "#6b7280",
          400: "#9ca3af",
          500: "#6b7280",
          700: "#374151",
        },
        plum: {
          DEFAULT: "#111111",
          700: "#111111",
          900: "#111111",
        },
        bone: "#ffffff",
        synapse: "#111111",
        copper: "#111111",
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        display: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        mono: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
        wordmark: ["\"Jost\"", "\"Century Gothic\"", "ui-sans-serif", "sans-serif"],
        cursive: ["\"Dancing Script\"", "cursive"],
        serifDisplay: ["\"Cinzel\"", "\"Fraunces\"", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
