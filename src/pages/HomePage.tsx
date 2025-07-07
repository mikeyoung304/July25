import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Utensils, Mic, History, Activity, ArrowRight, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  GlassCard,
  FloatingCard,
  Center,
  Spacer,
} from '@/design-system/components'
import { colors, spacing, pageTransitions, animations, stagger } from '@/design-system/tokens'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  buttonText: string
  buttonVariant: 'primary' | 'secondary' | 'tertiary'
  href: string
  delay?: number
}

function FeatureCard({ 
  title, 
  description, 
  icon, 
  iconBg, 
  buttonText, 
  buttonVariant, 
  href, 
  delay = 0 
}: FeatureCardProps) {
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
      <FloatingCard
        p={6}
        height="100%"
        className="group"
      >
        <VStack spacing={4} fullHeight>
          <HStack spacing={3} align="center">
            <Box
              p={2}
              borderRadius="lg"
              bg={iconBg}
              className="transition-transform duration-300 group-hover:scale-110"
            >
              {icon}
            </Box>
            <Heading level={3} className="text-macon-navy">
              {title}
            </Heading>
          </HStack>
          
          <Text color={colors.text.secondary} className="flex-1">
            {description}
          </Text>
          
          <Link to={href} className="w-full">
            <Button
              variant={buttonVariant}
              fullWidth
              icon={<ArrowRight className="h-4 w-4" />}
              iconPosition="right"
              className="group-hover:shadow-lg"
            >
              {buttonText}
            </Button>
          </Link>
        </VStack>
      </FloatingCard>
    </motion.div>
  )
}

export function HomePage() {
  return (
    <Box minHeight="100vh" bg={colors.background.primary}>
      {/* Hero Section */}
      <Box
        position="relative"
        overflow="hidden"
        pb={20}
      >
        {/* Background gradient */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="100%"
          bg="linear-gradient(135deg, #f5f7fa 0%, #e6ecf3 50%, #fff7ed 100%)"
          opacity={0.5}
        />
        
        {/* Animated orbs */}
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl opacity-20"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-orange-400 rounded-full filter blur-3xl opacity-20"
          animate={{
            x: [0, -50, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <Box position="relative" maxWidth="1280px" mx="auto" px={8} pt={12}>
          <VStack spacing={8} align="center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Center>
                <MaconLogo variant="full" size="xl" />
              </Center>
            </motion.div>
            
            {/* Hero text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <VStack spacing={4} align="center" maxWidth="800px">
                <Text
                  variant="display"
                  align="center"
                  weight="bold"
                  className="bg-gradient-to-r from-macon-navy to-macon-teal bg-clip-text text-transparent"
                >
                  Restaurant AI Platform
                </Text>
                <Text
                  variant="title2"
                  align="center"
                  color={colors.text.secondary}
                  className="max-w-2xl"
                >
                  Transform your restaurant operations with intelligent automation,
                  real-time insights, and seamless customer experiences.
                </Text>
              </VStack>
            </motion.div>
            
            {/* CTA Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <HStack spacing={4}>
                <Button size="lg" variant="primary" glowing>
                  Get Started
                </Button>
                <Button size="lg" variant="tertiary">
                  Watch Demo
                </Button>
              </HStack>
            </motion.div>
          </VStack>
        </Box>
      </Box>
      
      {/* Features Grid */}
      <Box maxWidth="1280px" mx="auto" px={8} pb={20}>
        <div className="grid md:grid-cols-2 gap-6">
          <FeatureCard
            title="Kitchen Display System"
            description="AI-powered real-time order management for kitchen staff. Smart prioritization, preparation time predictions, and seamless order tracking."
            icon={<Utensils className="h-6 w-6 text-macon-teal" />}
            iconBg={colors.brand.tertiary + '20'}
            buttonText="View Kitchen Display"
            buttonVariant="primary"
            href="/kitchen"
            delay={0}
          />
          
          <FeatureCard
            title="Voice Ordering Kiosk"
            description="Revolutionary natural language voice ordering. AI understands complex orders, dietary preferences, and provides instant confirmation."
            icon={<Mic className="h-6 w-6 text-macon-orange" />}
            iconBg={colors.brand.secondary + '20'}
            buttonText="Try Voice Kiosk"
            buttonVariant="secondary"
            href="/kiosk"
            delay={1}
          />
          
          <FeatureCard
            title="Order Analytics"
            description="Deep insights into order patterns, customer preferences, and revenue trends. AI-powered forecasting and actionable recommendations."
            icon={<History className="h-6 w-6 text-macon-navy" />}
            iconBg={colors.brand.primary + '20'}
            buttonText="View Analytics"
            buttonVariant="primary"
            href="/history"
            delay={2}
          />
          
          <FeatureCard
            title="Performance Insights"
            description="Real-time system monitoring with predictive alerts. Track API performance, optimize operations, and ensure seamless service."
            icon={<Activity className="h-6 w-6 text-macon-teal" />}
            iconBg={colors.brand.tertiary + '20'}
            buttonText="View Performance"
            buttonVariant="tertiary"
            href="/performance"
            delay={3}
          />
        </div>
      </Box>
      
      {/* Benefits Section */}
      <Box bg={colors.surface.secondary} py={20}>
        <Box maxWidth="1280px" mx="auto" px={8}>
          <VStack spacing={12}>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <VStack spacing={4} align="center">
                <HStack spacing={2} align="center">
                  <Sparkles className="h-5 w-5 text-macon-orange" />
                  <Text
                    variant="overline"
                    color={colors.brand.secondary}
                    weight="semibold"
                  >
                    Powered by AI
                  </Text>
                  <Sparkles className="h-5 w-5 text-macon-orange" />
                </HStack>
                <Heading level={2} align="center">
                  Why Choose MACON AI?
                </Heading>
              </VStack>
            </motion.div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <GlassCard variant="light" p={6}>
                  <VStack spacing={3} align="center">
                    <Box
                      p={3}
                      borderRadius="full"
                      bg={colors.brand.secondary + '20'}
                    >
                      <Zap className="h-8 w-8 text-macon-orange" />
                    </Box>
                    <Heading level={4}>Lightning Fast</Heading>
                    <Text align="center" color={colors.text.secondary}>
                      Process orders in milliseconds with our optimized AI engine
                    </Text>
                  </VStack>
                </GlassCard>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <GlassCard variant="light" p={6}>
                  <VStack spacing={3} align="center">
                    <Box
                      p={3}
                      borderRadius="full"
                      bg={colors.brand.primary + '20'}
                    >
                      <Shield className="h-8 w-8 text-macon-navy" />
                    </Box>
                    <Heading level={4}>Enterprise Secure</Heading>
                    <Text align="center" color={colors.text.secondary}>
                      Bank-level encryption and compliance for your data
                    </Text>
                  </VStack>
                </GlassCard>
              </motion.div>
              
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <GlassCard variant="light" p={6}>
                  <VStack spacing={3} align="center">
                    <Box
                      p={3}
                      borderRadius="full"
                      bg={colors.brand.tertiary + '20'}
                    >
                      <TrendingUp className="h-8 w-8 text-macon-teal" />
                    </Box>
                    <Heading level={4}>Proven Results</Heading>
                    <Text align="center" color={colors.text.secondary}>
                      30% increase in efficiency, 25% reduction in wait times
                    </Text>
                  </VStack>
                </GlassCard>
              </motion.div>
            </div>
          </VStack>
        </Box>
      </Box>
      
      {/* Footer CTA */}
      <Box py={20}>
        <Center>
          <VStack spacing={4} align="center">
            <Text variant="caption" color={colors.text.tertiary}>
              MACON AI SOLUTIONS
            </Text>
            <Text color={colors.text.secondary}>
              Bringing cutting-edge artificial intelligence to the restaurant industry
            </Text>
          </VStack>
        </Center>
      </Box>
    </Box>
  )
}