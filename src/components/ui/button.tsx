import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macon-orange/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
  {
    variants: {
      variant: {
        default:
          'bg-macon-navy text-white shadow-soft hover:bg-macon-navy-dark hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]',
        destructive:
          'bg-red-500 text-white shadow-soft hover:bg-red-600 hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]',
        outline:
          'border-2 border-macon-navy/20 bg-transparent text-macon-navy hover:bg-macon-navy/5 hover:border-macon-navy/30 hover:shadow-soft active:scale-[0.98]',
        secondary:
          'bg-macon-orange text-white shadow-soft hover:bg-macon-orange-dark hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]',
        ghost: 'text-macon-navy hover:bg-macon-navy/5 hover:text-macon-navy-dark active:scale-[0.98]',
        link: 'text-macon-orange underline-offset-4 hover:underline hover:text-macon-orange-dark',
        teal:
          'bg-macon-teal text-white shadow-soft hover:bg-macon-teal-dark hover:shadow-medium hover:scale-[1.02] active:scale-[0.98]',
        success:
          'bg-macon-teal text-white shadow-soft pointer-events-none',
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