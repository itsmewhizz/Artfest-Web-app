/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--primary) / <alpha-value>)',
        secondary: 'rgb(var(--secondary) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        mainBackground: 'rgb(var(--main-background) / <alpha-value>)',
        mainText: 'rgb(var(--main-text) / <alpha-value>)',
        mutedText: 'rgb(var(--muted-text) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        oceanTint: 'rgb(var(--ocean-tint) / <alpha-value>)',
        gold: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
