/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // MACON Brand Colors - Exact match from logo
        'macon-background': '#FCFCFA', // True off-white matching logo exactly
        'macon-navy': {
          DEFAULT: '#0A253D', // Exact navy blue from logo
          dark: '#061529',
          light: '#1a365d',
          50: '#e8edf5',
          100: '#d1dbeb',
          200: '#a3b7d7',
          300: '#7593c3',
          400: '#476faf',
          500: '#0A2540',
          600: '#081e33',
          700: '#061729',
          800: '#04101f',
          900: '#020814',
        },
        'macon-orange': {
          DEFAULT: '#FF6B35', // Vibrant orange from logo
          dark: '#e55a25',
          light: '#ff8255',
          50: '#fff5f0',
          100: '#ffebe0',
          200: '#ffd7c1',
          300: '#ffb392',
          400: '#ff8f63',
          500: '#FF6B35',
          600: '#e55a25',
          700: '#cc4915',
          800: '#993714',
          900: '#662512',
        },
        'macon-teal': {
          DEFAULT: '#4ECDC4', // Bright teal from logo
          dark: '#3eb5ac',
          light: '#6ed9d0',
          50: '#f0fffe',
          100: '#e0fffc',
          200: '#b8fff8',
          300: '#7ffff2',
          400: '#4ECDC4',
          500: '#36b5ac',
          600: '#2d9994',
          700: '#247d7b',
          800: '#1c6462',
          900: '#144a49',
        },
        // Neutral colors with brand tint
        'neutral': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Keep legacy colors for backward compatibility
        'macon-blue-dark': '#0E2E3B',
        'macon-teal-old': '#1B7A7A',
        'macon-orange-old': '#F29F67',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgba(10, 37, 64, 0.06), 0 2px 4px -2px rgba(10, 37, 64, 0.04)',
        'medium': '0 8px 16px -4px rgba(10, 37, 64, 0.08), 0 4px 8px -4px rgba(10, 37, 64, 0.06)',
        'large': '0 16px 32px -8px rgba(10, 37, 64, 0.10), 0 8px 16px -8px rgba(10, 37, 64, 0.08)',
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.15)',
        'glow-teal': '0 0 20px rgba(78, 205, 196, 0.15)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(10, 37, 64, 0.06)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
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

