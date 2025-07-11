import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onAnimationComplete: () => void
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  
  useEffect(() => {
    // Start exit animation after 2.5 seconds
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, 2500)
    
    // Complete transition after exit animation
    const completeTimer = setTimeout(() => {
      onAnimationComplete()
    }, 3200)
    
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [onAnimationComplete])

  return (
    <AnimatePresence>
      <motion.div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#FBFBFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated background gradients */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255, 107, 53, 0.08) 0%, transparent 40%), radial-gradient(ellipse at top right, rgba(78, 205, 196, 0.08) 0%, transparent 40%), radial-gradient(ellipse at bottom left, rgba(42, 75, 92, 0.08) 0%, transparent 40%)',
          }}
        />
        
        {/* Logo with sophisticated animations */}
        <motion.div
          className="relative"
          initial={{ scale: 0 }}
          animate={isExiting ? {
            scale: 1.1,
            opacity: 0,
          } : {
            scale: 1,
            opacity: 1,
          }}
          transition={{
            scale: {
              type: "spring",
              stiffness: 200,
              damping: 15,
              duration: 1.2,
            },
            opacity: {
              duration: isExiting ? 0.5 : 1,
            }
          }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 blur-3xl"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0, 0.3, 0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              times: [0, 0.3, 0.5, 0.8, 1],
              repeat: isExiting ? 0 : Infinity,
              repeatType: "reverse",
            }}
            style={{
              background: 'radial-gradient(circle, rgba(255, 107, 53, 0.4) 0%, rgba(78, 205, 196, 0.3) 50%, transparent 70%)',
              transform: 'scale(1.5)',
            }}
          />
          
          {/* Logo image */}
          <motion.img
            src="/transparent.png"
            alt="MACON AI SOLUTIONS"
            style={{
              width: '70vw',
              height: '70vh',
              objectFit: 'contain',
              maxWidth: '600px',
              maxHeight: '600px',
              position: 'relative',
              zIndex: 1,
            }}
            initial={{ filter: 'brightness(0.8) contrast(1.1)' }}
            animate={{ 
              filter: [
                'brightness(0.8) contrast(1.1)',
                'brightness(1.2) contrast(1.2)',
                'brightness(1) contrast(1)',
              ],
              rotate: [0, 1, 0, -1, 0],
            }}
            transition={{
              filter: {
                duration: 2,
                times: [0, 0.5, 1],
              },
              rotate: {
                duration: 4,
                ease: "easeInOut",
                repeat: isExiting ? 0 : Infinity,
              }
            }}
          />
          
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.7) 50%, transparent 60%)',
              backgroundSize: '200% 200%',
              backgroundPosition: '-100% 0',
              mixBlendMode: 'overlay',
              zIndex: 2,
            }}
          >
            <motion.div
              className="w-full h-full"
              animate={{
                backgroundPosition: ['200% 0', '-100% 0'],
              }}
              transition={{
                duration: 2,
                delay: 1,
                ease: "easeInOut",
                repeat: isExiting ? 0 : 1,
              }}
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.7) 50%, transparent 60%)',
                backgroundSize: '200% 200%',
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}