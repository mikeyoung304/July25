import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onAnimationComplete: () => void
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoEndTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  
  useEffect(() => {
    // Preload video
    if (videoRef.current) {
      videoRef.current.load()
    }
    
    // Start exit animation after video ends or after 5 seconds max
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, 5000)
    
    // Complete transition after exit animation
    const completeTimer = setTimeout(() => {
      onAnimationComplete()
    }, 5700)
    
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
      if (videoEndTimerRef.current) {
        clearTimeout(videoEndTimerRef.current)
      }
    }
  }, [onAnimationComplete])

  const handleVideoEnd = () => {
    setIsExiting(true)
    videoEndTimerRef.current = setTimeout(onAnimationComplete, 700)
  }

  const handleVideoError = () => {
    console.warn('Video failed to load, falling back to logo animation')
    setVideoError(true)
  }

  return (
    <AnimatePresence>
      <motion.div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {!videoError ? (
          <>
            {/* Full Bleed Video with Enhancement Filters */}
            <motion.video
              ref={videoRef}
              className="absolute inset-0 w-full h-full"
              style={{
                objectFit: 'cover',
                minWidth: '100%',
                minHeight: '100%',
                width: 'auto',
                height: 'auto',
                // Visual enhancements to smooth out imperfections
                filter: 'contrast(1.05) brightness(1.02) saturate(1.1)',
                imageRendering: 'optimizeQuality' as any,
                willChange: 'transform',
                backfaceVisibility: 'hidden',
                perspective: '1000px',
                transform: 'translateZ(0)', // Force GPU acceleration
              }}
              autoPlay
              muted
              playsInline
              preload="auto"
              onCanPlayThrough={() => setVideoLoaded(true)}
              onEnded={handleVideoEnd}
              onError={handleVideoError}
              initial={{ scale: 1.1, opacity: 0, filter: 'blur(2px)' }}
              animate={isExiting ? {
                scale: 1.05,
                opacity: 0,
                filter: 'blur(4px)',
              } : {
                scale: 1,
                opacity: videoLoaded ? 1 : 0,
                filter: 'blur(0px)',
              }}
              transition={{
                scale: {
                  duration: 0.8,
                  ease: "easeOut",
                },
                opacity: {
                  duration: isExiting ? 0.5 : 0.6,
                },
                filter: {
                  duration: 0.6,
                }
              }}
            >
              <source src="/assets/mikeyoung304-1.mp4" type="video/mp4" />
            </motion.video>

            {/* Subtle overlay to smooth visual artifacts */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, transparent 60%, rgba(0,0,0,0.05) 100%)',
                mixBlendMode: 'multiply',
              }}
            />

            {/* Loading indicator if video is not ready */}
            {!videoLoaded && (
              <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-white/80 rounded-full"
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        ) : (
          /* Fallback to original logo animation if video fails */
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
              }}
              transition={{
                filter: {
                  duration: 2,
                  times: [0, 0.5, 1],
                }
              }}
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}