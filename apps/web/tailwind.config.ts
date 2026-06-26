import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17120f",
        muted: "#746b63",
        line: "#ded7cf",
        brand: "#d86f21",
        brandDark: "#a94b12",
        ember: "#f59e0b",
        coal: "#14110f",
        danger: "#b91c1c"
      }
    }
  },
  plugins: []
};

export default config;
