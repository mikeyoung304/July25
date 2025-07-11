import React from 'react'

interface SkipLink {
  href: string
  label: string
}

interface SkipNavigationProps {
  links?: SkipLink[]
}

const defaultLinks: SkipLink[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#orders', label: 'Skip to orders' }
]

export const SkipNavigation: React.FC<SkipNavigationProps> = ({ 
  links = defaultLinks 
}) => {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <div className="absolute top-0 left-0 z-50 bg-background p-2">
        {links.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="block px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:bg-accent mb-2"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  )
}