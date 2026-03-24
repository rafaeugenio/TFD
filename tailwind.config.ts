/**
 * TFD — Tailwind CSS Configuration
 *
 * NOTE: This project uses Tailwind CSS v4, which handles theme configuration
 * natively via the `@theme` directive in CSS (see src/app/globals.css).
 *
 * This file serves as a TypeScript reference for the design tokens and can
 * be consumed by `@config` in CSS if legacy plugin support is ever needed:
 *
 *   @config "../tailwind.config.ts";
 *
 * All color values point to the CSS custom properties defined in
 * src/styles/variables.css so there is a single source of truth.
 */

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },
    extend: {
      /* --- Colors (mapped from CSS custom properties) --- */
      colors: {
        "tfd-primary": {
          50:  "var(--tfd-primary-50)",
          100: "var(--tfd-primary-100)",
          200: "var(--tfd-primary-200)",
          300: "var(--tfd-primary-300)",
          400: "var(--tfd-primary-400)",
          500: "var(--tfd-primary-500)",
          600: "var(--tfd-primary-600)",
          700: "var(--tfd-primary-700)",
          800: "var(--tfd-primary-800)",
          900: "var(--tfd-primary-900)",
        },
        "tfd-secondary": {
          50:  "var(--tfd-secondary-50)",
          100: "var(--tfd-secondary-100)",
          200: "var(--tfd-secondary-200)",
          300: "var(--tfd-secondary-300)",
          400: "var(--tfd-secondary-400)",
          500: "var(--tfd-secondary-500)",
          600: "var(--tfd-secondary-600)",
          700: "var(--tfd-secondary-700)",
          800: "var(--tfd-secondary-800)",
          900: "var(--tfd-secondary-900)",
        },
        "tfd-surface": {
          0:       "var(--tfd-surface-0)",
          50:      "var(--tfd-surface-50)",
          100:     "var(--tfd-surface-100)",
          200:     "var(--tfd-surface-200)",
          300:     "var(--tfd-surface-300)",
          400:     "var(--tfd-surface-400)",
          500:     "var(--tfd-surface-500)",
          600:     "var(--tfd-surface-600)",
          700:     "var(--tfd-surface-700)",
          800:     "var(--tfd-surface-800)",
          900:     "var(--tfd-surface-900)",
          950:     "var(--tfd-surface-950)",
          ground:  "var(--tfd-surface-ground)",
          card:    "var(--tfd-surface-card)",
          sidebar: "var(--tfd-surface-sidebar)",
          header:  "var(--tfd-surface-header)",
          border:  "var(--tfd-surface-border)",
          hover:   "var(--tfd-surface-hover)",
        },
        "tfd-text": {
          primary:    "var(--tfd-text-primary)",
          secondary:  "var(--tfd-text-secondary)",
          muted:      "var(--tfd-text-muted)",
          "on-dark":  "var(--tfd-text-on-dark)",
          "on-primary": "var(--tfd-text-on-primary)",
        },
        "tfd-status": {
          success:      "var(--tfd-status-success)",
          "success-bg": "var(--tfd-status-success-bg)",
          warning:      "var(--tfd-status-warning)",
          "warning-bg": "var(--tfd-status-warning-bg)",
          danger:       "var(--tfd-status-danger)",
          "danger-bg":  "var(--tfd-status-danger-bg)",
          info:         "var(--tfd-status-info)",
          "info-bg":    "var(--tfd-status-info-bg)",
        },
      },

      /* --- Border Radius (PrimeNG Aura tokens) --- */
      borderRadius: {
        none: "var(--tfd-radius-none)",
        xs:   "var(--tfd-radius-xs)",
        sm:   "var(--tfd-radius-sm)",
        md:   "var(--tfd-radius-md)",
        lg:   "var(--tfd-radius-lg)",
        xl:   "var(--tfd-radius-xl)",
        pill: "var(--tfd-radius-pill)",
      },

      /* --- Box Shadow (PrimeNG Aura tokens) --- */
      boxShadow: {
        form:    "var(--tfd-shadow-form)",
        sm:      "var(--tfd-shadow-sm)",
        card:    "var(--tfd-shadow-card)",
        overlay: "var(--tfd-shadow-overlay)",
        modal:   "var(--tfd-shadow-modal)",
      },

      /* --- Font Size (PrimeNG scale) --- */
      fontSize: {
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem",     { lineHeight: "1.5rem" }],
        lg:   ["1.125rem", { lineHeight: "1.75rem" }],
        xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",  { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },

      /* --- Font Family --- */
      fontFamily: {
        sans: ["var(--tfd-font-family)"],
        mono: ["var(--tfd-font-mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
