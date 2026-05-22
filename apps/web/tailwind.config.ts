import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },
        secondary: {
          DEFAULT: '#4ECDC4',
          50: '#EDFAF9',
          100: '#D5F5F3',
          200: '#A8EBE7',
          300: '#7AE0DA',
          400: '#4ECDC4',
          500: '#35B5AC',
          600: '#279990',
          700: '#1D7A73',
          800: '#145C57',
          900: '#0C3E3B',
        },
        accent: {
          DEFAULT: '#A29BFE',
          50: '#F5F4FF',
          100: '#ECEAFF',
          200: '#D5D1FF',
          300: '#BDB8FF',
          400: '#A29BFE',
          500: '#8B83FD',
          600: '#6C62FC',
          700: '#4D41FB',
          800: '#2E20FA',
          900: '#1409E8',
        },
        success: '#00B894',
        danger: '#FF4757',
        warning: '#FDCB6E',
        dark: '#2D3436',
        muted: '#636E72',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
