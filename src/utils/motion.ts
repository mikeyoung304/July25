import { type Variants } from 'framer-motion'

// Spring animation configs for consistent motion
export const spring = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export const smoothSpring = {
  type: 'spring',
  stiffness: 200,
  damping: 25,
}

export const bounceSpring = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
}

// Common animation variants
export const fadeInUp: Variants = {
  initial: { 
    opacity: 0, 
    y: 20 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: smoothSpring
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
}

export const scaleIn: Variants = {
  initial: { 
    scale: 0.8, 
    opacity: 0 
  },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: spring
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    transition: { duration: 0.15 }
  }
}

export const slideInRight: Variants = {
  initial: { 
    x: 100, 
    opacity: 0 
  },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: smoothSpring
  },
  exit: { 
    x: -100, 
    opacity: 0,
    transition: { duration: 0.2 }
  }
}

// Stagger children animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    }
  }
}

export const staggerItem: Variants = {
  initial: { 
    opacity: 0, 
    y: 10 
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: smoothSpring
  }
}

// Celebration animation for success states
export const celebrate: Variants = {
  initial: { 
    scale: 0.5, 
    opacity: 0, 
    rotate: -180 
  },
  animate: { 
    scale: [0.5, 1.2, 1], 
    opacity: 1, 
    rotate: 0,
    transition: {
      ...bounceSpring,
      scale: {
        times: [0, 0.6, 1],
        duration: 0.8
      }
    }
  }
}

// Urgency pulse animation
export const urgencyPulse = {
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatType: 'reverse' as const,
    }
  }
}

// Shimmer effect for loading states
export const shimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

// Hover lift effect
export const hoverLift = {
  whileHover: {
    y: -4,
    scale: 1.02,
    transition: spring
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  }
}

// Page transition variants
export const pageTransition: Variants = {
  initial: { 
    opacity: 0,
    scale: 0.98,
  },
  animate: { 
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }
  }
}