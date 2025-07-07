import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Package, Utensils } from 'lucide-react'
import {
  Box,
  VStack,
  Text,
  Heading,
  FloatingCard,
} from '@/design-system/components'
import { colors, animations } from '@/design-system/tokens'

interface DashboardCardProps {
  title: string
  icon: React.ReactNode
  iconBg: string
  href: string
  delay?: number
}

function DashboardCard({ 
  title, 
  icon, 
  iconBg, 
  href, 
  delay = 0 
}: DashboardCardProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: animations.slideInUp.from,
        animate: {
          ...animations.slideInUp.to,
          transition: { delay: delay * 0.1, ...animations.slideInUp.config }
        }
      }}
    >
      <Link to={href}>
        <FloatingCard
          p={8}
          height="100%"
          minHeight="250px"
          className="group cursor-pointer"
        >
          <VStack spacing={6} fullHeight justify="center" align="center">
            <Box
              p={4}
              borderRadius="xl"
              bg={iconBg}
              className="transition-transform duration-300 group-hover:scale-110"
            >
              {icon}
            </Box>
            <Heading level={2} className="text-macon-navy">
              {title}
            </Heading>
          </VStack>
        </FloatingCard>
      </Link>
    </motion.div>
  )
}

export function Dashboard() {
  return (
    <Box minHeight="100vh" bg={colors.background.primary}>
      <Box
        position="relative"
        overflow="hidden"
        py={20}
      >
        <Box position="relative" maxWidth="1280px" mx="auto" px={8}>
          <VStack spacing={12} align="center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <VStack spacing={2} align="center">
                <Heading level={1} className="text-macon-navy">
                  Restaurant Command Center
                </Heading>
                <Text color={colors.text.secondary} variant="body">
                  Select a module to manage your operations
                </Text>
              </VStack>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8 w-full max-w-4xl">
              <DashboardCard
                title="Orders"
                icon={<ShoppingCart className="h-12 w-12 text-macon-orange" />}
                iconBg={colors.brand.secondary + '20'}
                href="/history"
                delay={0}
              />
              
              <DashboardCard
                title="Expo"
                icon={<Package className="h-12 w-12 text-macon-teal" />}
                iconBg={colors.brand.tertiary + '20'}
                href="/expo"
                delay={1}
              />
              
              <DashboardCard
                title="Kitchen"
                icon={<Utensils className="h-12 w-12 text-macon-navy" />}
                iconBg={colors.brand.primary + '20'}
                href="/kitchen"
                delay={2}
              />
            </div>
          </VStack>
        </Box>
      </Box>
    </Box>
  )
}