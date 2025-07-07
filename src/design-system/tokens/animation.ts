/**
 * MACON AI Solutions - Animation Token System
 * Apple-grade animations with spring physics and smooth transitions
 */

// Duration scale - in milliseconds
export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 700,
  
  // Semantic durations
  interaction: 150, // Button clicks, hovers
  transition: 250, // Page transitions, modals
  complex: 350, // Complex animations
  stagger: 50, // Delay between staggered items
}

// Easing curves - Apple's smooth animations
export const easing = {
  // Standard easing
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // Cubic bezier curves - Apple-inspired
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material standard
  smoothIn: 'cubic-bezier(0.4, 0, 1, 1)',
  smoothOut: 'cubic-bezier(0, 0, 0.2, 1)',
  
  // Acceleration curves
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Spring-like curves
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  springSmooth: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  springBounce: 'cubic-bezier(0.87, -0.41, 0.19, 1.44)',
  
  // Emphasized easing for important actions
  emphasized: 'cubic-bezier(0.83, 0, 0.17, 1)',
  emphasizedIn: 'cubic-bezier(0.83, 0, 1, 1)',
  emphasizedOut: 'cubic-bezier(0, 0, 0.17, 1)',
}

// Spring configurations for react-spring
export const springs = {
  // Gentle spring for subtle animations
  gentle: {
    tension: 120,
    friction: 14,
    mass: 1,
  },
  
  // Standard spring for most interactions
  default: {
    tension: 170,
    friction: 26,
    mass: 1,
  },
  
  // Snappy spring for quick responses
  snappy: {
    tension: 300,
    friction: 30,
    mass: 1,
  },
  
  // Bouncy spring for playful interactions
  bouncy: {
    tension: 300,
    friction: 20,
    mass: 1,
  },
  
  // Stiff spring for immediate response
  stiff: {
    tension: 400,
    friction: 40,
    mass: 1,
  },
  
  // Slow spring for dramatic effects
  slow: {
    tension: 100,
    friction: 20,
    mass: 1,
  },
}

// Animation presets
export const animations = {
  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: springs.gentle,
  },
  
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    config: springs.gentle,
  },
  
  // Scale animations
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
    config: springs.default,
  },
  
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.95)', opacity: 0 },
    config: springs.default,
  },
  
  // Slide animations
  slideInLeft: {
    from: { transform: 'translateX(-20px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
    config: springs.default,
  },
  
  slideInRight: {
    from: { transform: 'translateX(20px)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
    config: springs.default,
  },
  
  slideInUp: {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
    config: springs.default,
  },
  
  slideInDown: {
    from: { transform: 'translateY(-20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
    config: springs.default,
  },
  
  // Bounce effect
  bounce: {
    from: { transform: 'scale(1)' },
    to: [
      { transform: 'scale(1.05)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ],
    config: springs.bouncy,
  },
  
  // Shake effect for errors
  shake: {
    from: { transform: 'translateX(0)' },
    to: [
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(-10px)' },
      { transform: 'translateX(10px)' },
      { transform: 'translateX(0)' },
    ],
    config: { duration: 300 },
  },
  
  // Pulse effect for attention
  pulse: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: [
      { transform: 'scale(1.05)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    config: springs.gentle,
  },
}

// Transition utilities for CSS
export const transitions = {
  // Property-specific transitions
  opacity: `opacity ${duration.normal}ms ${easing.smooth}`,
  transform: `transform ${duration.normal}ms ${easing.smooth}`,
  color: `color ${duration.fast}ms ${easing.smooth}`,
  background: `background-color ${duration.fast}ms ${easing.smooth}`,
  border: `border-color ${duration.fast}ms ${easing.smooth}`,
  shadow: `box-shadow ${duration.normal}ms ${easing.smooth}`,
  
  // Combined transitions
  all: `all ${duration.normal}ms ${easing.smooth}`,
  colors: `color ${duration.fast}ms ${easing.smooth}, background-color ${duration.fast}ms ${easing.smooth}, border-color ${duration.fast}ms ${easing.smooth}`,
  interaction: `transform ${duration.interaction}ms ${easing.smooth}, box-shadow ${duration.interaction}ms ${easing.smooth}`,
  
  // Preset combinations
  button: `all ${duration.interaction}ms ${easing.smooth}`,
  card: `transform ${duration.normal}ms ${easing.smooth}, box-shadow ${duration.normal}ms ${easing.smooth}`,
  modal: `opacity ${duration.transition}ms ${easing.smooth}, transform ${duration.transition}ms ${easing.spring}`,
}

// Keyframe animations
export const keyframes = {
  // Spin animation
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  
  // Pulse animation
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `,
  
  // Bounce animation
  bounce: `
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }
  `,
  
  // Wiggle animation
  wiggle: `
    @keyframes wiggle {
      0%, 100% { transform: rotate(0deg); }
      25% { transform: rotate(-3deg); }
      75% { transform: rotate(3deg); }
    }
  `,
  
  // Slide in from bottom
  slideUp: `
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `,
  
  // Fade in scale
  fadeInScale: `
    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
}

// Animation utility functions
export const createTransition = (
  properties: string[],
  options?: {
    duration?: number
    easing?: keyof typeof easing | string
    delay?: number
  }
) => {
  const {
    duration: dur = duration.normal,
    easing: ease = easing.smooth,
    delay = 0,
  } = options || {}
  
  const easingValue = typeof ease === 'string' && ease in easing 
    ? easing[ease as keyof typeof easing] 
    : ease
  
  return properties
    .map(prop => `${prop} ${dur}ms ${easingValue} ${delay}ms`)
    .join(', ')
}

// Stagger utility for list animations
export const stagger = (
  index: number,
  options?: {
    delay?: number
    duration?: number
    easing?: keyof typeof easing
  }
) => {
  const {
    delay = duration.stagger,
    duration: dur = duration.normal,
    easing: ease = 'smooth',
  } = options || {}
  
  return {
    animationDelay: `${index * delay}ms`,
    animationDuration: `${dur}ms`,
    animationTimingFunction: easing[ease],
    animationFillMode: 'both',
  }
}

// Hover animation preset
export const hoverAnimation = (scale = 1.02) => ({
  transition: transitions.interaction,
  cursor: 'pointer',
  '&:hover': {
    transform: `scale(${scale})`,
  },
  '&:active': {
    transform: `scale(${scale * 0.98})`,
  },
})

// Focus animation preset
export const focusAnimation = (color: string) => ({
  transition: transitions.all,
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${color}40`,
  },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: `0 0 0 3px ${color}40`,
  },
})

// Page transition presets
export const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.transition / 1000 },
  },
  
  slide: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: { 
      type: 'spring',
      ...springs.default,
    },
  },
  
  scale: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.1, opacity: 0 },
    transition: {
      type: 'spring',
      ...springs.gentle,
    },
  },
}