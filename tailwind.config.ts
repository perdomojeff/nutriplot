import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        verde: {
          50:  '#F0FDF4', // fondos / tarjetas
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#A7F3D0',
          400: '#6EE7B7',
          500: '#10B981', // primario
          700: '#047857',
          600: '#059669', // primario hover
          900: '#064E3B', // bosque: títulos, navegación
        },
      },
      borderRadius: { '3xl': '1.5rem' },
      fontFamily: { sans: ['Figtree', 'system-ui', 'sans-serif'], display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
