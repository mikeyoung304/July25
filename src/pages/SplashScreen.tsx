import React, { useEffect } from 'react'

interface SplashScreenProps {
  onAnimationComplete: () => void
}

export function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  useEffect(() => {
    // Simple 3 second delay before transitioning
    const timer = setTimeout(() => {
      onAnimationComplete()
    }, 3000)
    
    return () => clearTimeout(timer)
  }, [onAnimationComplete])

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FAF8F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <img
        src="/macon-logo.png"
        alt="MACON AI SOLUTIONS"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          maxWidth: '90vw',
          maxHeight: '90vh',
        }}
      />
    </div>
  )
}