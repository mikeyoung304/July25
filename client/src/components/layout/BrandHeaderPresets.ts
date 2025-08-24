/**
 * Preset configurations for BrandHeader component
 * Separated from component file to satisfy React Refresh requirements
 */

export const BrandHeaderPresets = {
  /** HomePage style - centered with large logo */
  homepage: {
    centered: true,
    logoSize: 'lg' as const,
    logoHeightClasses: 'h-14 md:h-16 lg:h-20',
    title: 'Restaurant OS',
    subtitle: 'Select your workspace'
  },
  
  /** Dashboard style - centered with medium logo and prominent dashboard button */
  dashboard: {
    centered: true,
    logoSize: 'md' as const,
    showBackToDashboard: true,
    backToDashboardVariant: 'button' as const,
    title: 'Restaurant Command Center',
    subtitle: 'Select a module to manage your operations'
  },
  
  /** Admin style - left aligned with prominent dashboard button and larger logo */
  admin: {
    centered: false,
    logoSize: 'md' as const,
    logoHeightClasses: 'h-12 md:h-14 w-auto',
    showBackToDashboard: true,
    backToDashboardVariant: 'button' as const
  },
  
  /** Server style - left aligned with prominent dashboard button and larger logo */
  server: {
    centered: false,
    logoSize: 'md' as const,
    logoHeightClasses: 'h-12 md:h-14 w-auto',
    showBackToDashboard: true,
    backToDashboardVariant: 'button' as const
  }
}