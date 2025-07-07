/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // MACON Brand Colors - Matching the actual logo
        'macon-navy': {
          DEFAULT: '#1a365d',
          dark: '#0f2442',
          light: '#2d4a7c',
          50: '#e6ecf3',
          100: '#ccd9e7',
          200: '#99b3cf',
          300: '#668db7',
          400: '#33679f',
          500: '#1a365d',
          600: '#162d4d',
          700: '#12243d',
          800: '#0e1b2d',
          900: '#0a121d',
        },
        'macon-orange': {
          DEFAULT: '#fb923c',
          dark: '#ea7c1c',
          light: '#fca85c',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        'macon-teal': {
          DEFAULT: '#38b2ac',
          dark: '#2c8a86',
          light: '#4dd4cc',
          50: '#e6fffa',
          100: '#b2f5ea',
          200: '#81e6d9',
          300: '#4dd4cc',
          400: '#38b2ac',
          500: '#319795',
          600: '#2c8a86',
          700: '#287876',
          800: '#236665',
          900: '#1e5555',
        },
        // Keep legacy colors for backward compatibility
        'macon-blue-dark': '#0E2E3B',
        'macon-teal-old': '#1B7A7A',
        'macon-orange-old': '#F29F67',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      keyframes: {
        'pulse-once': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'flash': {
          '0%, 50%, 100%': { opacity: '1' },
          '25%, 75%': { opacity: '0' },
        },
        'scale-up': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'pulse-preparing': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 0.5)'
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)',
            borderColor: 'rgba(59, 130, 246, 1)'
          },
        },
        'pulse-ready': {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.5)',
            borderColor: 'rgba(34, 197, 94, 0.5)'
          },
          '50%': { 
            boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)',
            borderColor: 'rgba(34, 197, 94, 1)'
          },
        },
      },
      animation: {
        'pulse-once': 'pulse-once 0.5s ease-in-out',
        'shake': 'shake 0.5s ease-in-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'flash': 'flash 1s ease-in-out',
        'scale-up': 'scale-up 0.3s ease-in-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'pulse-preparing': 'pulse-preparing 2s ease-in-out infinite',
        'pulse-ready': 'pulse-ready 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

