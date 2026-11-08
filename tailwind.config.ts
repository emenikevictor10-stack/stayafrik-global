import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // PRD §9 scales: sizes 12/13/15/16/20/24 (+30 hero); weights 400/600; radius 4-20.
    fontSize: {
      "2xs": ["12px", "16px"],
      xs: ["12px", "16px"],
      sm: ["13px", "18px"],
      base: ["15px", "22px"],
      lg: ["16px", "24px"],
      xl: ["20px", "28px"],
      "2xl": ["24px", "30px"],
      "3xl": ["24px", "30px"],
      "4xl": ["30px", "36px"],
      "5xl": ["30px", "36px"],
      "6xl": ["30px", "36px"],
      "7xl": ["30px", "36px"],
    },
    fontWeight: {
      normal: "400",
      medium: "400",
      semibold: "600",
      bold: "600",
      extrabold: "600",
      black: "600",
    },
    borderRadius: {
      none: "0",
      xs: "4px",
      sm: "6px",
      DEFAULT: "8px",
      md: "8px",
      lg: "10px",
      xl: "12px",
      "2xl": "16px",
      "3xl": "20px",
      full: "9999px",
    },
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
        display: ['Figtree', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dim: "hsl(var(--primary-dim))",
        },
        success: "hsl(var(--success))",
        blue: { DEFAULT: "hsl(var(--blue))", hover: "hsl(var(--blue-hover))" },
        orange: "hsl(var(--orange))",
        danger: "hsl(var(--danger))",
        line: "hsl(var(--line))",
        surface: "hsl(var(--surface))",
        off: "hsl(var(--off))",
        scrim: "hsl(var(--scrim))",
        "warn-bg": "hsl(var(--warn-bg))",
        "warn-fg": "hsl(var(--warn-fg))",
        chart: { 1: "hsl(var(--chart-1))", 2: "hsl(var(--chart-2))", wash: "hsl(var(--chart-wash))" },
        search: {
          surface: "hsl(var(--search-surface))",
          muted: "hsl(var(--search-muted))",
          hover: "hsl(var(--search-hover))",
        },
        hint: {
          low: "hsl(var(--hint-low))",
          "low-foreground": "hsl(var(--hint-low-foreground))",
          high: "hsl(var(--hint-high))",
          "high-foreground": "hsl(var(--hint-high-foreground))",
        },
        info: "hsl(var(--info))",
        warn: "hsl(var(--warn))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        search: "var(--search-shadow)",
        "search-open": "var(--search-shadow-open)",
      },
      keyframes: {
        "panel-in": {
          from: { opacity: "0", transform: "translateY(-8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "panel-in": "panel-in 220ms ease-out",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-up": "fade-up 0.6s cubic-bezier(0.32, 0.72, 0, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
