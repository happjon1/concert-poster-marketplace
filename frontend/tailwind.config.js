/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          // Olive green
          DEFAULT: 'var(--primary-color)',
          50: '#637800',
          100: '#637800',
          200: '#637800',
          300: '#798d00',
          400: '#4d6300',
          500: '#4d6300', // Primary color
          600: '#3a4c00',
          700: '#2a3600', // Darker shade
          800: '#1a2000',
          900: '#1a2000',
        },
        secondary: {
          // Warm brown
          DEFAULT: 'var(--secondary-color)',
          500: '#5e4e47',
        },
        tertiary: {
          // Terracotta/rust
          DEFAULT: 'var(--tertiary-color)',
          500: '#903c00',
        },
        accent: 'var(--accent-color)',
        warn: 'var(--warn-color)',
        error: '#ba1a1a',
      },
      fontFamily: {
        sans: ['var(--font-family-base)'],
        heading: ['var(--font-family-heading)'],
      },
    },
  },
  plugins: [],
};
