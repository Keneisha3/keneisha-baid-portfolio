/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Pantone-inspired palette: Blue Opal primary, Rhythmic Red secondary,
        // warm Amberlight/Toffee neutrals, Skyway as a soft accent.
        // Token names kept (blush/pink/rose/plum) so components re-skin in place.

        // blush = warm Amberlight neutral surfaces
        blush: {
          50: "#FBF8F3",
          100: "#F4EADD",
          200: "#E8D6C2",
          300: "#D9BD9F",
          400: "#B5946F",
        },
        // pink = PRIMARY accent (Blue Opal) + Skyway lighter step
        pink: {
          DEFAULT: "#1C3F5F",
          400: "#6E92B4", // Skyway-leaning
          500: "#1C3F5F",
          600: "#163750",
          700: "#10293C",
        },
        // rose = SECONDARY accent (Rhythmic Red / Syrah)
        rose: {
          DEFAULT: "#A4343A",
          400: "#C0565B",
          500: "#A4343A",
          700: "#6E1E2E", // Syrah
        },
        // skyway = soft blue accent
        skyway: {
          DEFAULT: "#AFC7DE",
          400: "#AFC7DE",
        },
        // plum = Toffee / Tawny Port deep ink for text
        plum: {
          DEFAULT: "#4A3526",
          700: "#5C2935", // Tawny Port
          900: "#2A1D16",
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
