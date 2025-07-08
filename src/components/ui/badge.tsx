import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-macon-orange/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-macon-navy/10 text-macon-navy border border-macon-navy/20 hover:bg-macon-navy/20",
        secondary:
          "bg-macon-orange/10 text-macon-orange border border-macon-orange/20 hover:bg-macon-orange/20",
        destructive:
          "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
        outline: "border border-neutral-300 text-neutral-700 hover:bg-neutral-50",
        success:
          "bg-macon-teal/10 text-macon-teal-dark border border-macon-teal/20 hover:bg-macon-teal/20",
        warning:
          "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }