/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B5FFF', // sapphire blue
        'primary-dark': '#233E8B', // deep indigo
        accent: '#F59E42', // orange (kept for contrast)
        'accent-dark': '#EA580C', // deep orange
        background: '#FDF6F0', // light funky background
        'background-dark': '#18181B', // dark funky background
        surface: '#FFFFFF',
        'surface-dark': '#27272A',
        text: '#18181B', // dark text
        'text-light': '#FDF6F0', // light text
        'text-muted': '#A1A1AA',
      },
      fontFamily: {
        inter: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    }
  },
  plugins: [],
}
