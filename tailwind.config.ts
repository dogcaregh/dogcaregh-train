import type { Config } from "tailwindcss";

// DogTrainerGH design system (from the build brief):
// Regal, classic, elegant. Brown + white are the main colors;
// royal gold used sparingly as the single accent.
const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        espresso: "#2A1A0F",
        mahogany: "#452A18",
        walnut: "#6B4226",
        chestnut: "#8C5A34",
        gold: "#B98A32",
        "gold-soft": "#D6B25E",
        ivory: "#FBF7F0",
        cream: "#F3EADB",
        hairline: "#E5D8C4",
        muted: "#8A7862",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
