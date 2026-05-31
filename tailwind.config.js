/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Light-pink theme palette
        blush: {
          50: "#FFF7FA",
          100: "#FFEDF3",
          200: "#FFDCE9",
          300: "#FFC4DA",
          400: "#FFA6C6",
        },
        pink: {
          DEFAULT: "#EC4899",
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
          700: "#BE185D",
        },
        rose: {
          DEFAULT: "#FB7185",
          400: "#FB7185",
          500: "#F43F5E",
        },
        plum: {
          DEFAULT: "#5A3149",
          700: "#4A2840",
          900: "#3A1E32",
        },
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
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "gradient-shift": "gradient-shift 14s ease infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
