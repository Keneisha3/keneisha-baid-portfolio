/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral, warm-stone theme with a muted slate-blue accent.
        // Token names kept (blush/pink/rose/plum) so components re-skin in place.
        blush: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
        },
        pink: {
          DEFAULT: "#64769B",
          400: "#93A4C0",
          500: "#64769B",
          600: "#4F6080",
          700: "#3D4D6B",
        },
        rose: {
          DEFAULT: "#64769B",
          400: "#93A4C0",
          500: "#64769B",
        },
        plum: {
          DEFAULT: "#44403C",
          700: "#292524",
          900: "#1C1917",
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
