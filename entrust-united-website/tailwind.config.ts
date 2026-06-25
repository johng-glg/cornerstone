import type { Config } from 'tailwindcss';

/**
 * Brand tokens live here. To re-skin the site, edit the `brand` and `accent`
 * scales below — every component references these via Tailwind classes.
 * See README.md → "Swapping colors & fonts".
 */
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — deep navy/teal: trust, stability, finance.
        brand: {
          50: '#eef6f7',
          100: '#d3e7ea',
          200: '#a7cfd5',
          300: '#72afb8',
          400: '#458b96',
          500: '#2f6f7b',
          600: '#235863',
          700: '#1c4750',
          800: '#163840', // primary surface
          900: '#102a31',
          950: '#0a1c20',
        },
        // Warm accent — amber/coral: care, warmth, calls-to-action.
        accent: {
          50: '#fff6ed',
          100: '#ffe9d2',
          200: '#fed0a3',
          300: '#fdb06a',
          400: '#fb8b3a',
          500: '#f26d18',
          600: '#e3530e',
          700: '#bc3d0f',
          800: '#953214',
          900: '#782c14',
        },
      },
      fontFamily: {
        // Body — clean humanist sans (system stack; no network dependency).
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Headings — characterful serif for warmth + gravitas.
        heading: [
          'ui-serif',
          'Iowan Old Style',
          'Apple Garamond',
          'Georgia',
          'Cambria',
          'Times New Roman',
          'serif',
        ],
      },
      maxWidth: {
        content: '72rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
