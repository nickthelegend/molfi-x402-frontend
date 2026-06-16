/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        success: "var(--success)",
        
        primary: "var(--primary)",
        "primary-dim": "var(--primary-dim)",
        "primary-container": "var(--primary-container)",
        "on-primary": "var(--on-primary)",
        "on-primary-container": "var(--on-primary-container)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container": "var(--surface-container)",
        "surface-container-high": "var(--surface-container-high)",
        "surface-container-highest": "var(--surface-container-highest)",
        "on-surface": "var(--on-surface)",
        "on-surface-variant": "var(--on-surface-variant)",
        outline: "var(--outline)",
        "outline-variant": "var(--outline-variant)",
        
        // Shadcn UI mapped theme colors
        background: "var(--bg)",
        popover: "var(--surface-3)",
        "popover-foreground": "var(--text)",
        muted: "var(--surface-2)",
        "muted-foreground": "var(--text-muted)",
        input: "var(--border)",
        accent: "var(--surface-3)",
        "accent-foreground": "var(--text)",
        secondary: "var(--surface-2)",
        "secondary-foreground": "var(--text)",
        ring: "var(--accent)",
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'monospace'],
        headline: ["var(--font-display)", "sans-serif"],
      }
    },
  },
  plugins: [],
};
