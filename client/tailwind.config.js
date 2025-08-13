/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B5FFF', // sapphire blue (light mode)
        'primary-dark': '#00D8C2', // deep indigo (light mode hover)
        accent: '#F59E42', // orange (kept for contrast)
        'accent-dark': '#EA580C', // deep orange
        background: '#FDF6F0', // light funky background
        'background-dark': '#23272F', // lighter dark grey for dark mode
        surface: '#FFFFFF',
        'surface-dark': '#27272A',
        text: '#18181B', // dark text (light mode)
        'text-dark': '#E5E7EB', // light grey for dark mode
        'text-light': '#FDF6F0', // light text (not used for body)
        'text-muted': '#A1A1AA',
        'text-primary-dark': '#00D8C2', // teal for dark mode primary text
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: [],
}
