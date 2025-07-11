import * as React from 'react'
import { cn } from '@/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-lg border border-neutral-200/80 bg-white px-4 py-2.5 text-sm',
          'shadow-sm hover:shadow-elevation-1',
          'transition-all duration-300 ease-spring',
          'hover:border-macon-orange/30',
          'focus:border-macon-orange/50 focus:shadow-elevation-2',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-macon-orange/20 focus-visible:ring-offset-2',
          'placeholder:text-neutral-400 placeholder:transition-opacity focus:placeholder:opacity-70',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:border-neutral-200',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'bg-gradient-to-b from-white to-neutral-50/50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }