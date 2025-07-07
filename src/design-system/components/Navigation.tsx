import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Utensils, Mic, History, Activity } from 'lucide-react'
import { cn } from '@/utils/cn'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { Box, HStack, Text, Surface } from '../components'
import { colors, spacing, radius, transitions, glass } from '../tokens'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  ariaLabel: string
}

const navItems: NavItem[] = [
  {
    path: '/',
    label: 'Home',
    icon: <Home className="h-5 w-5" />,
    ariaLabel: 'Home page',
  },
  {
    path: '/kitchen',
    label: 'Kitchen Display',
    icon: <Utensils className="h-5 w-5" />,
    ariaLabel: 'Kitchen Display System',
  },
  {
    path: '/kiosk',
    label: 'Voice Kiosk',
    icon: <Mic className="h-5 w-5" />,
    ariaLabel: 'Voice Ordering Kiosk',
  },
  {
    path: '/history',
    label: 'Order History',
    icon: <History className="h-5 w-5" />,
    ariaLabel: 'Order History and Analytics',
  },
  {
    path: '/performance',
    label: 'Performance',
    icon: <Activity className="h-5 w-5" />,
    ariaLabel: 'Performance Monitoring Dashboard',
  },
]

export function Navigation() {
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  return (
    <Box
      as="nav"
      position="fixed"
      width="100%"
      zIndex={1000}
      transition="all"
      style={{
        top: 0,
        left: 0,
        right: 0,
        transition: transitions.all,
      }}
      id="navigation"
      role="navigation"
      aria-label="Main navigation"
    >
      <Surface
        variant={scrolled ? 'glass' : 'flat'}
        glassEffect="light"
        blur={scrolled}
        border={false}
        rounded={false}
        p={0}
        style={{
          borderBottom: `1px solid ${scrolled ? colors.border.subtle : colors.border.default}`,
          background: scrolled ? glass.light.background : colors.background.primary,
        }}
      >
        <Box
          maxWidth="1280px"
          mx="auto"
          px={{ mobile: 4, tablet: 6, desktop: 8 }}
        >
          <HStack
            spacing={0}
            justify="space-between"
            height="64px"
          >
            {/* Logo */}
            <Link 
              to="/" 
              className={cn(
                'flex-shrink-0 flex items-center mr-8',
                'rounded-lg transition-all duration-200',
                'hover:opacity-80 active:scale-95',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-400'
              )}
              aria-label="MACON AI Solutions Home"
            >
              <MaconLogo size="sm" className="h-12 w-auto" />
            </Link>
            
            {/* Navigation Items */}
            <HStack spacing={1} role="list" className="flex-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'group relative flex items-center px-4 py-2 rounded-xl',
                      'transition-all duration-200',
                      'hover:bg-gray-100/80 active:scale-95',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-400',
                      isActive && 'text-blue-600'
                    )}
                    role="listitem"
                    aria-label={item.ariaLabel}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <HStack spacing={2} align="center">
                      <Box
                        color={isActive ? colors.brand.primary : colors.text.secondary}
                        transition="colors"
                        className="group-hover:text-blue-600"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </Box>
                      <Text
                        variant="callout"
                        weight={isActive ? 'semibold' : 'medium'}
                        color={isActive ? colors.brand.primary : colors.text.primary}
                        className="group-hover:text-blue-600"
                      >
                        {item.label}
                      </Text>
                    </HStack>
                    
                    {/* Active indicator */}
                    {isActive && (
                      <Box
                        position="absolute"
                        bottom="0"
                        left="50%"
                        width="40px"
                        height="3px"
                        bg={colors.brand.primary}
                        borderRadius="full"
                        style={{
                          transform: 'translateX(-50%)',
                        }}
                      />
                    )}
                  </Link>
                )
              })}
            </HStack>
            
            {/* Right side actions could go here */}
          </HStack>
        </Box>
      </Surface>
    </Box>
  )
}

// Export a spacer component to push content below the fixed navigation
export function NavigationSpacer() {
  return <Box height="64px" />
}