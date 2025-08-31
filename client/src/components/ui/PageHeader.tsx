import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Home } from 'lucide-react'
import { PageTitle, Body } from '@/components/ui/Typography'
import { Button } from '@/components/ui/button'
import { spacing } from '@/lib/typography'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  showHome?: boolean
  backPath?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  showHome = false,
  backPath,
  actions,
  className = ''
}: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backPath) {
      navigate(backPath)
    } else {
      navigate(-1)
    }
  }

  const handleHome = () => {
    navigate('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${spacing.page.section} ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="rounded-full hover:bg-macon-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {showHome && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHome}
              className="rounded-full hover:bg-macon-primary/10"
            >
              <Home className="h-5 w-5" />
            </Button>
          )}
          <div>
            <PageTitle>{title}</PageTitle>
            {subtitle && (
              <Body className="text-neutral-600 mt-1">{subtitle}</Body>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function SectionHeader({
  title,
  subtitle,
  actions,
  className = ''
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${spacing.content.stack} ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-neutral-600 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}