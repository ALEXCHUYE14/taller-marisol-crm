import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        // Paleta "Natural Warmth"
        olive: {
          DEFAULT: "#3E4E3A",
          50: "#F2F4F0",
          100: "#E1E6DD",
          200: "#C3CDBB",
          300: "#9FAF93",
          400: "#7A8D6D",
          500: "#5A6C4F",
          600: "#4A5B42",
          700: "#3E4E3A",
          800: "#2F3B2C",
          900: "#1F281D",
        },
        terracotta: {
          DEFAULT: "#D27C5A",
          50: "#FBF1EC",
          100: "#F6E0D5",
          200: "#EDC1AB",
          300: "#E3A182",
          400: "#D27C5A",
          500: "#C2643F",
          600: "#A14F31",
          700: "#7F3E27",
        },
        linen: "#FBF9F5",
        warmgray: {
          DEFAULT: "#E8E5DF",
          100: "#F3F1EC",
          200: "#E8E5DF",
          300: "#D6D1C7",
          400: "#B3AC9F",
          500: "#8A8378",
          600: "#6B655B",
          700: "#4D4841",
          800: "#2F2C28",
        },
        burgundy: { DEFAULT: "#8B2E3C", 50: "#F8ECEE", 100: "#F0D5DA", 600: "#8B2E3C", 700: "#6E2430" },
        amber: { 50: "#FDF6E7", 100: "#FAE9C2", 500: "#D9921A", 600: "#B7760F", 700: "#8A580B" },
        border: "#E8E5DF",
        background: "#FBF9F5",
        foreground: "#2F2C28",
        primary: { DEFAULT: "#3E4E3A", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#D27C5A", foreground: "#FFFFFF" },
        muted: { DEFAULT: "#F3F1EC", foreground: "#6B655B" },
        ring: "#D27C5A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1.25rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(47,44,40,0.04), 0 4px 16px rgba(47,44,40,0.06)",
        lift: "0 8px 30px rgba(62,78,58,0.18)",
      },
      minHeight: { touch: "48px" },
      height: { touch: "48px" },
    },
  },
  plugins: [animate],
};

export default config;
