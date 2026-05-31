import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#FAFAFA",      // page bg
        surface: "#FFFFFF",      // card bg
        line:    "#EAEAEA",      // hairline
        line2:   "#D4D4D4",      // stronger
        ink: {
          900: "#0A0A0A",        // primary text
          700: "#404040",        // secondary
          500: "#737373",        // muted
          300: "#A3A3A3",        // placeholder
        },
        brand: {
          50:  "#EEF4FF",
          100: "#DCE7FF",
          400: "#3370F7",
          500: "#0046C7",        // primary accent: deep sport blue
          600: "#003494",
          700: "#002566",
        },
        danger: "#DC2626",
        warn:   "#D97706",
        ok:     "#059669",
      },
      fontFamily: {
        sans: [
          "'Inter'",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["'JetBrains Mono'", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: {
        xl:  "10px",
        "2xl": "14px",
        "3xl": "20px",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(10, 10, 10, 0.04), 0 1px 1px rgba(10, 10, 10, 0.03)",
        pop:  "0 2px 8px rgba(10, 10, 10, 0.06), 0 1px 2px rgba(10, 10, 10, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
