import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAF8F5",
        foreground: "#111827",
        neo: {
          orange: "#FF7A00",
          teal: "#2DD4BF",
          lavender: "#C084FC",
          yellow: "#FBBF24",
          bg: "#FAF8F5",
          border: "#000000",
          muted: "#F3F4F6",
          dark: "#18181B",
        },
      },
      boxShadow: {
        neo: "3px 3px 0 0 #000000",
        "neo-md": "4px 4px 0 0 #000000",
        "neo-lg": "6px 6px 0 0 #000000",
        "neo-bottom": "0 4px 0 0 #000000",
        "neo-sm": "2px 2px 0 0 #000000",
        "neo-inner": "inset 2px 2px 0 0 #000000",
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [],
};
export default config;
