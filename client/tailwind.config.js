/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#08070d",
        panel: "rgba(18, 16, 32, 0.6)",
        gold: {
          light: "#ffe07d",
          DEFAULT: "#d4af37",
          dark: "#aa840d",
        },
        cyber: {
          blue: "#00f0ff",
          purple: "#bd00ff",
          green: "#39ff14",
          red: "#ff007f",
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'neon-blue': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-purple': '0 0 15px rgba(189, 0, 255, 0.4)',
        'neon-gold': '0 0 15px rgba(212, 175, 55, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
};
