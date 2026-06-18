import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F8FA",
        ink: "#14201E",
        brand: "#0E5C55",
        brandbright: "#12B0A0",
        overdue: "#DC2626",
        soon: "#D97706",
        done: "#15803D",
        neutral: "#475569",
        card: "#FFFFFF",
        line: "#E6E9EE",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
