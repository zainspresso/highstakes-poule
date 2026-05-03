import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0b1020",
          800: "#111733",
          700: "#1a2143",
          600: "#252d54",
        },
        accent: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
        warn: {
          400: "#fbbf24",
          500: "#f59e0b",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16, 185, 129, 0.4), 0 8px 24px -8px rgba(16, 185, 129, 0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
