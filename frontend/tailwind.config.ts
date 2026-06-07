import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1E4A8C",
          "blue-700": "#173B70",
          "blue-50": "#EEF5FF",
          red: "#DC2626",
          gold: "#D4A017",
          green: "#16A34A",
        },
        ink: "#102033",
        muted: "#667085",
        paper: "#FFFFFF",
        sand: "#F8F5EF",
        border: "#E5E7EB",
      },
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', '"Tajawal"', '"Cairo"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        "card-lg": "28px",
      },
    },
  },
  plugins: [],
};

export default config;
