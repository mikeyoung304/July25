/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
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

