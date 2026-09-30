/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fin: {
          bg: {
            dark: '#090d16',
            light: '#f8fafc',
          },
          panel: {
            dark: 'rgba(16, 23, 38, 0.72)',
            light: 'rgba(255, 255, 255, 0.85)',
          },
          card: {
            dark: 'rgba(21, 30, 48, 0.65)',
            light: 'rgba(255, 255, 255, 0.75)',
          },
          border: {
            dark: 'rgba(255, 255, 255, 0.08)',
            light: 'rgba(15, 23, 42, 0.08)',
          },
          hover: {
            dark: 'rgba(255, 255, 255, 0.05)',
            light: 'rgba(15, 23, 42, 0.04)',
          }
        },
        income: {
          DEFAULT: '#10b981',
          light: '#d1fae5',
          dark: '#065f46',
          glow: 'rgba(16, 185, 129, 0.15)'
        },
        expense: {
          DEFAULT: '#f43f5e',
          light: '#ffe4e6',
          dark: '#881337',
          glow: 'rgba(244, 63, 94, 0.15)'
        },
        warning: {
          DEFAULT: '#f59e0b',
          light: '#fef3c7',
          dark: '#78350f',
          glow: 'rgba(245, 158, 11, 0.15)'
        },
        info: {
          DEFAULT: '#38bdf8',
          light: '#e0f2fe',
          dark: '#075985',
          glow: 'rgba(56, 189, 248, 0.15)'
        },
        accent: {
          DEFAULT: '#6366f1',
          light: '#e0e7ff',
          dark: '#3730a3',
          glow: 'rgba(99, 102, 241, 0.2)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'glass-sm': '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
        'glass-md': '0 8px 30px 0 rgba(0, 0, 0, 0.12)',
        'glass-lg': '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
        'glass-glow': '0 0 25px -5px rgba(99, 102, 241, 0.2)',
        'glass-income': '0 0 20px -5px rgba(16, 185, 129, 0.2)',
        'glass-expense': '0 0 20px -5px rgba(244, 63, 94, 0.2)',
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '40px',
      }
    },
  },
  plugins: [],
};
