import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        base: "#0A0A0F",
        card: "#12121A",
        elevated: "#1A1A24",
        accent: {
          DEFAULT: "#7C6FF7",
          hover: "#9185FF",
          muted: "rgba(124, 111, 247, 0.15)",
        },
        success: "#22C55E",
        muted: "#71717A",
        foreground: "#FAFAFA",
        "foreground-secondary": "#A1A1AA",
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 111, 247, 0.35)",
        "glow-sm": "0 0 20px rgba(124, 111, 247, 0.25)",
        "glow-lg": "0 0 60px rgba(124, 111, 247, 0.45)",
        card: "0 4px 24px rgba(0, 0, 0, 0.4)",
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.06)",
      },
      animation: {
        "gradient-shift": "gradientShift 8s ease infinite",
        "border-pulse": "borderPulse 2s ease-in-out infinite",
      },
      keyframes: {
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        borderPulse: {
          "0%, 100%": { borderColor: "rgba(124, 111, 247, 0.3)" },
          "50%": { borderColor: "rgba(124, 111, 247, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
