/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Apple-inspired Minimal Color System
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
        // Single accent color - refined teal
        'accent': {
          DEFAULT: '#4ECDC4',
          50: '#f0fdfc',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Legacy support for existing components
        'primary': {
          DEFAULT: '#171717',
          50: '#fafafa',
          100: '#f5f5f5',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        'macon-teal': {
          DEFAULT: '#4ECDC4',
          50: '#f0fdfc',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      // Apple's 8-point grid system
      spacing: {
        '1': '0.125rem',    // 2px
        '2': '0.25rem',     // 4px  
        '3': '0.5rem',      // 8px
        '4': '1rem',        // 16px
        '6': '1.5rem',      // 24px
        '8': '2rem',        // 32px
        '10': '2.5rem',     // 40px
        '12': '3rem',       // 48px
        '16': '4rem',       // 64px
        '20': '5rem',       // 80px
        '24': '6rem',       // 96px
        '32': '8rem',       // 128px
      },
      boxShadow: {
        // Apple-inspired minimal shadows
        'card': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.15)',
        'card-active': '0 1px 2px rgba(0, 0, 0, 0.20)',
        // Legacy support
        'elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'elevation-2': '0 4px 6px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'elevation-4': '0 20px 25px rgba(0, 0, 0, 0.1)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.12)',
        'medium': '0 4px 6px rgba(0, 0, 0, 0.15)',
        'large': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'hover': '0 4px 6px rgba(0, 0, 0, 0.15)',
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
        'card-hover': {
          '0%': { transform: 'translateY(0) scale(1)' },
          '100%': { transform: 'translateY(-8px) scale(1.02)' },
        },
        'smooth-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
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
        'card-hover': 'card-hover 0.3s ease-out',
        'smooth-bounce': 'smooth-bounce 2s ease-in-out infinite',
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
        'apple': 'cubic-bezier(0.4, 0, 0.2, 1)', // Apple's standard timing
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'apple': '300ms', // Apple's standard duration
      },
    },
  },
  plugins: [],
}

