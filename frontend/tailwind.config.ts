import type { Config } from "tailwindcss";

// Design tokens (D15): colors/blur/opacity are CSS variables so the
// glassmorphism look can change without rewrites. Dark is the default theme.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Maximal-glass ink/line helpers (rgb channels + opacity slot).
        ink: {
          DEFAULT: "rgb(var(--kf-ink) / 0.94)",
          muted: "rgb(var(--kf-ink) / 0.62)",
          subtle: "rgb(var(--kf-ink) / 0.40)",
        },
        line: {
          DEFAULT: "rgb(var(--kf-line) / 0.10)",
          strong: "rgb(var(--kf-line) / 0.16)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
      keyframes: {
        kfSpin: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "spin-slow": "kfSpin 90s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
