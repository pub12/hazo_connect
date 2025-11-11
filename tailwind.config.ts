// tailwind.config.ts configures TailwindCSS for styling within hazo_connect.
import type { Config } from "tailwindcss";

// tailwind_config centralizes Tailwind settings to keep styles consistent.
const tailwind_config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./stories/**/*.{ts,tsx}",
    "./node_modules/@storybook/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
};

export default tailwind_config;

