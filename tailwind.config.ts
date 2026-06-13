import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          page: '#F8FAFC',
          card: '#FFFFFF',
          sidebar: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
