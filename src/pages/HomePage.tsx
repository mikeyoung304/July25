import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Utensils, Mic, History, Activity, ArrowRight, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react'
import { MaconLogo } from '@/components/brand/MaconLogo'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  iconBg: string
  buttonText: string
  buttonVariant?: 'default' | 'secondary' | 'outline'
  href: string
  delay?: number
}

function FeatureCard({ 
  title, 
  description, 
  icon, 
  iconBg, 
  buttonText, 
  buttonVariant = 'default',
  href, 
  delay = 0 
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: delay * 0.1, 
        duration: 0.6,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
    >
      <Card className="p-0 h-full group relative overflow-visible">
        {/* Gradient border effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl blur-sm"
          style={{
            background: `linear-gradient(135deg, ${iconBg}40 0%, ${iconBg}20 100%)`
          }} 
        />
        
        <div className="relative bg-white rounded-xl p-6 flex flex-col h-full space-y-4">
          <div className="flex items-center space-x-4">
            <motion.div
              className="p-3 rounded-xl shadow-elevation-2 relative overflow-hidden"
              style={{ backgroundColor: iconBg }}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {/* Icon glow effect */}
              <div className="absolute inset-0 bg-gradient-radial from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {icon}
            </motion.div>
            <h3 className="text-xl font-bold text-macon-navy">
              {title}
            </h3>
          </div>
          
          <p className="text-neutral-600 flex-1 leading-relaxed">
            {description}
          </p>
          
          <Link to={href} className="w-full">
            <Button variant={buttonVariant} className="w-full group/btn relative overflow-hidden">
              <span className="relative z-10 flex items-center justify-center w-full">
                {buttonText}
                <motion.div
                  className="ml-2"
                  initial={{ x: 0 }}
                  animate={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              </span>
              
              {/* Button hover effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: '-100%' }}
                whileHover={{ x: '100%' }}
                transition={{ duration: 0.6 }}
              />
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  )
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-macon-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden pb-24">
        {/* Background gradient with brand colors */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: 'linear-gradient(135deg, #FCFCFA 0%, rgba(78, 205, 196, 0.15) 50%, rgba(255, 107, 53, 0.15) 100%)'
          }}
        />
        
        {/* Animated orbs with brand colors */}
        <motion.div
          className="absolute top-20 left-10 w-128 h-128 bg-gradient-to-br from-macon-teal/20 to-macon-teal/5 rounded-full filter blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-128 h-128 bg-gradient-to-br from-macon-orange/20 to-macon-orange/5 rounded-full filter blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-8 pt-12">
          <div className="flex flex-col items-center space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <MaconLogo size="lg" className="h-32 w-auto" />
            </motion.div>
            
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-center space-y-4 max-w-3xl"
            >
              <h1 className="text-5xl md:text-6xl font-bold text-macon-navy leading-tight">
                Welcome to Macon AI Restaurant OS
              </h1>
              <p className="text-xl text-neutral-600 leading-relaxed max-w-2xl mx-auto">
                Revolutionize your restaurant operations with AI-powered order management,
                real-time kitchen display, and voice-enabled ordering
              </p>
            </motion.div>
            
            {/* Feature Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-6xl mt-16">
              <FeatureCard
                title="Kitchen Display"
                description="Real-time order tracking with smart station routing and prep time optimization"
                icon={<Utensils className="h-6 w-6 text-white" />}
                iconBg="#0A253D"
                buttonText="Open Kitchen"
                href="/kitchen"
                delay={0}
              />
              
              <FeatureCard
                title="Voice Kiosk"
                description="Natural language ordering with AI-powered voice recognition and menu understanding"
                icon={<Mic className="h-6 w-6 text-white" />}
                iconBg="#FF6B35"
                buttonText="Start Ordering"
                buttonVariant="secondary"
                href="/kiosk"
                delay={1}
              />
              
              <FeatureCard
                title="Order History"
                description="Comprehensive order tracking with search, filters, and analytics"
                icon={<History className="h-6 w-6 text-white" />}
                iconBg="#4ECDC4"
                buttonText="View Orders"
                buttonVariant="teal"
                href="/history"
                delay={2}
              />
              
              <FeatureCard
                title="Analytics"
                description="Real-time performance metrics and insights to optimize operations"
                icon={<Activity className="h-6 w-6 text-white" />}
                iconBg="#3eb5ac"
                buttonText="View Analytics"
                buttonVariant="teal"
                href="/performance"
                delay={3}
              />
            </div>
            
            {/* Features Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="w-full max-w-5xl mt-24"
            >
              <Card className="p-10 bg-gradient-to-br from-macon-navy/5 via-transparent to-macon-orange/5 border-0 shadow-large">
                <h2 className="text-3xl font-bold text-center text-macon-navy mb-10">
                  Why Choose Macon AI?
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex items-start space-x-4 group">
                    <div className="p-2 rounded-lg bg-macon-orange/10 group-hover:bg-macon-orange/20 transition-colors">
                      <Sparkles className="h-5 w-5 text-macon-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-macon-navy text-lg">AI-Powered Intelligence</h3>
                      <p className="text-neutral-600 mt-1">Smart order routing and predictive analytics</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="p-2 rounded-lg bg-macon-teal/10 group-hover:bg-macon-teal/20 transition-colors">
                      <Zap className="h-5 w-5 text-macon-teal" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-macon-navy text-lg">Real-Time Updates</h3>
                      <p className="text-neutral-600 mt-1">Instant synchronization across all stations</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="p-2 rounded-lg bg-macon-navy/10 group-hover:bg-macon-navy/20 transition-colors">
                      <Shield className="h-5 w-5 text-macon-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-macon-navy text-lg">Enterprise Security</h3>
                      <p className="text-neutral-600 mt-1">Bank-level security for your data</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 group">
                    <div className="p-2 rounded-lg bg-macon-orange/10 group-hover:bg-macon-orange/20 transition-colors">
                      <TrendingUp className="h-5 w-5 text-macon-orange" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-macon-navy text-lg">Boost Efficiency</h3>
                      <p className="text-neutral-600 mt-1">Reduce wait times by up to 40%</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}