import type { Config } from "tailwindcss";

// Design tokens lifted from matrix-reasoning-example.html so the built UI
// matches the approved visual language.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1a1d24",
        muted: "#6b7280",
        line: "#d7dbe2",
        bg: "#f4f5f7",
        card: "#ffffff",
        accent: "#2f6df6",
        "accent-soft": "#e8f0ff",
        shape: "#1a1d24",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
