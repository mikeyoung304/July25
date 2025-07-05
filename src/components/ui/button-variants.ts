import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-manipulation',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-95',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-95',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-95',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2 min-w-[44px]',
        sm: 'h-11 rounded-md px-3 min-w-[44px]',
        lg: 'h-12 rounded-md px-8 min-w-[48px]',
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