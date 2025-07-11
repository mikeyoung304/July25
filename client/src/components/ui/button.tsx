import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium touch-manipulation relative overflow-hidden isolate ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-macon-orange/20 focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-navy text-white shadow-elevation-2 ' +
          'hover:shadow-elevation-3 hover:scale-[1.02] ' +
          'active:scale-[0.98] active:shadow-elevation-1 ' +
          'transition-all duration-300 ease-spring ' +
          'before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/10 before:to-transparent before:opacity-0 ' +
          'hover:before:opacity-100 before:transition-opacity before:-z-10',
        destructive:
          'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-elevation-2 ' +
          'hover:shadow-glow-urgent hover:scale-[1.02] ' +
          'active:scale-[0.98] active:shadow-elevation-1 ' +
          'transition-all duration-300 ease-spring',
        outline:
          'border-2 border-macon-navy/20 bg-transparent text-macon-navy ' +
          'hover:bg-gradient-to-br hover:from-macon-navy/5 hover:to-macon-navy/10 ' +
          'hover:border-macon-navy/30 hover:shadow-elevation-1 ' +
          'active:scale-[0.98] transition-all duration-300 ease-spring',
        secondary:
          'bg-gradient-orange text-white shadow-elevation-2 ' +
          'hover:shadow-glow-orange hover:scale-[1.02] ' +
          'active:scale-[0.98] active:shadow-elevation-1 ' +
          'transition-all duration-300 ease-spring ' +
          'before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/10 before:to-transparent before:opacity-0 ' +
          'hover:before:opacity-100 before:transition-opacity before:-z-10',
        ghost: 
          'text-macon-navy hover:bg-gradient-to-br hover:from-macon-navy/5 hover:to-transparent ' +
          'hover:text-macon-navy-dark active:scale-[0.98] transition-all duration-300 ease-spring',
        link: 
          'text-macon-orange underline-offset-4 hover:underline hover:text-macon-orange-dark ' +
          'transition-all duration-300 ease-spring',
        teal:
          'bg-gradient-teal text-white shadow-elevation-2 ' +
          'hover:shadow-glow-teal hover:scale-[1.02] ' +
          'active:scale-[0.98] active:shadow-elevation-1 ' +
          'transition-all duration-300 ease-spring ' +
          'before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/10 before:to-transparent before:opacity-0 ' +
          'hover:before:opacity-100 before:transition-opacity before:-z-10',
        success:
          'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-glow-success ' +
          'animate-bounce-in pointer-events-none',
      },
      size: {
        default: 'h-11 px-6 py-2 min-w-[44px]',
        sm: 'h-9 rounded-lg px-4 min-w-[44px] text-sm',
        lg: 'h-12 rounded-lg px-8 min-w-[48px] text-base',
        icon: 'h-11 w-11 min-w-[44px]',
        touch: 'h-12 w-12 min-w-[48px] text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'teal' | 'success'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }