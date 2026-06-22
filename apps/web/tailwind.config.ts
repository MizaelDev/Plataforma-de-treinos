import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141414",
        muted: "#6b7280",
        line: "#e5e7eb",
        brand: "#0f766e",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
