/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Warm-stone neutrals with a teal primary + coral secondary accent.
        // Token names kept (blush/pink/rose/plum) so components re-skin in place.
        // blush = warm neutral surfaces
        blush: {
          50: "#FBFAF8",
          100: "#F4F1EC",
          200: "#E7E2D9",
          300: "#D6CFC2",
          400: "#A8A096",
        },
        // pink = PRIMARY accent (teal)
        pink: {
          DEFAULT: "#0D9488",
          400: "#2DD4BF",
          500: "#0D9488",
          600: "#0F766E",
          700: "#115E59",
        },
        // rose = SECONDARY accent (coral)
        rose: {
          DEFAULT: "#F76C5E",
          400: "#FB8C7E",
          500: "#F76C5E",
        },
        // plum = text / deep ink
        plum: {
          DEFAULT: "#3D3A36",
          700: "#2A2723",
          900: "#1A1815",
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
