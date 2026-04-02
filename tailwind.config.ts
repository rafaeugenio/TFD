/**
 * TFD — Tailwind CSS Configuration v4
 * Design System: PrimeOne 4.0.0 (Citiesoft Projects)
 *
 * Primary source of truth: src/styles/variables.css
 * This file is a TypeScript mirror for tooling.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      colors: {
        "tfd-blue": {
          50:  "var(--tfd-blue-50)",
          100: "var(--tfd-blue-100)",
          200: "var(--tfd-blue-200)",
          300: "var(--tfd-blue-300)",
          400: "var(--tfd-blue-400)",
          500: "var(--tfd-blue-500)",
          600: "var(--tfd-blue-600)",
          700: "var(--tfd-blue-700)",
          800: "var(--tfd-blue-800)",
          900: "var(--tfd-blue-900)",
        },
      },
      borderRadius: {
        xs:   "var(--tfd-radius-xs)",
        sm:   "var(--tfd-radius-sm)",
        md:   "var(--tfd-radius-md)",
        lg:   "var(--tfd-radius-lg)",
        xl:   "var(--tfd-radius-xl)",
        "2xl": "var(--tfd-radius-2xl)",
        full: "var(--tfd-radius-full)",
      },
      boxShadow: {
        xs:      "var(--tfd-shadow-xs)",
        sm:      "var(--tfd-shadow-sm)",
        md:      "var(--tfd-shadow-md)",
        lg:      "var(--tfd-shadow-lg)",
        xl:      "var(--tfd-shadow-xl)",
      },
      fontFamily: {
        sans: ["var(--tfd-font)"],
        mono: ["var(--tfd-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
