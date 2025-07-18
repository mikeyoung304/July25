/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // MACON Brand Colors - Exact match from logo
        'macon-background': '#FBFBFA', // Updated off-white background
        'macon-logo-blue': '#2A4B5C', // Dark blue from transparent logo
        'macon-navy': {
          DEFAULT: '#0A253D', // Exact navy blue from logo
          dark: '#061529',
          light: '#1a365d',
          50: '#e8edf5',
          100: '#d1dbeb',
          200: '#a3b7d7',
          300: '#7593c3',
          400: '#476faf',
          500: '#0A253D',
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
        // Elevation System - Apple-inspired layered shadows
        'elevation-0': 'none',
        'elevation-1': '0 1px 2px -1px rgba(10, 37, 64, 0.08), 0 2px 4px -2px rgba(10, 37, 64, 0.04)',
        'elevation-2': '0 4px 8px -2px rgba(10, 37, 64, 0.08), 0 2px 4px -2px rgba(10, 37, 64, 0.04), 0 0 0 1px rgba(10, 37, 64, 0.02)',
        'elevation-3': '0 8px 16px -4px rgba(10, 37, 64, 0.08), 0 4px 8px -4px rgba(10, 37, 64, 0.06), 0 0 0 1px rgba(10, 37, 64, 0.02)',
        'elevation-4': '0 16px 32px -8px rgba(10, 37, 64, 0.10), 0 8px 16px -8px rgba(10, 37, 64, 0.08), 0 0 0 1px rgba(10, 37, 64, 0.03)',
        'elevation-modal': '0 24px 48px -12px rgba(10, 37, 64, 0.18), 0 12px 24px -8px rgba(10, 37, 64, 0.12), 0 0 0 1px rgba(10, 37, 64, 0.04)',
        // Interactive shadows
        'hover': '0 8px 30px -8px rgba(10, 37, 64, 0.12), 0 0 0 1px rgba(78, 205, 196, 0.2)',
        'active': '0 2px 8px -4px rgba(10, 37, 64, 0.12), 0 0 0 1px rgba(255, 107, 53, 0.3)',
        // Glow effects for status
        'glow-orange': '0 0 20px rgba(255, 107, 53, 0.15), 0 0 40px rgba(255, 107, 53, 0.1)',
        'glow-teal': '0 0 20px rgba(78, 205, 196, 0.15), 0 0 40px rgba(78, 205, 196, 0.1)',
        'glow-urgent': '0 0 30px rgba(239, 68, 68, 0.3), 0 0 60px rgba(239, 68, 68, 0.15)',
        'glow-success': '0 0 30px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.15)',
        // Legacy (for backward compatibility)
        'soft': '0 2px 8px -2px rgba(10, 37, 64, 0.06), 0 2px 4px -2px rgba(10, 37, 64, 0.04)',
        'medium': '0 8px 16px -4px rgba(10, 37, 64, 0.08), 0 4px 8px -4px rgba(10, 37, 64, 0.06)',
        'large': '0 16px 32px -8px rgba(10, 37, 64, 0.10), 0 8px 16px -8px rgba(10, 37, 64, 0.08)',
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
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
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
        // New sophisticated animations
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
      },
      backgroundImage: {
        // Gradient overlays for depth
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-radial-t': 'radial-gradient(ellipse at top, var(--tw-gradient-stops))',
        'gradient-radial-b': 'radial-gradient(ellipse at bottom, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        // Brand gradients
        'gradient-macon': 'linear-gradient(135deg, #FF6B35 0%, #4ECDC4 100%)',
        'gradient-orange': 'linear-gradient(135deg, #FF6B35 0%, #ff8255 100%)',
        'gradient-teal': 'linear-gradient(135deg, #4ECDC4 0%, #6ed9d0 100%)',
        'gradient-navy': 'linear-gradient(135deg, #0A253D 0%, #1a365d 100%)',
        // Subtle overlays
        'gradient-surface': 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '8px',
        'modal': '16px',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}

