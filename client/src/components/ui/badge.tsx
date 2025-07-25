import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300 ease-spring " +
  "relative overflow-hidden isolate focus:outline-none focus:ring-2 focus:ring-macon-orange/20 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-macon-navy/10 to-macon-navy/5 text-macon-navy " +
          "border border-macon-navy/10 shadow-sm " +
          "hover:from-macon-navy/20 hover:to-macon-navy/10 hover:shadow-elevation-1 " +
          "hover:scale-[1.05] active:scale-[0.98]",
        secondary:
          "bg-gradient-to-br from-macon-orange/10 to-macon-orange/5 text-macon-orange " +
          "border border-macon-orange/10 shadow-sm " +
          "hover:from-macon-orange/20 hover:to-macon-orange/10 hover:shadow-elevation-1 " +
          "hover:scale-[1.05] active:scale-[0.98]",
        destructive:
          "bg-gradient-to-br from-danger-100 to-danger-50 text-danger-700 " +
          "border border-danger-200/50 shadow-sm " +
          "hover:from-danger-200 hover:to-danger-100 hover:shadow-elevation-1 " +
          "hover:scale-[1.05] active:scale-[0.98]",
        outline: 
          "border border-neutral-300 text-neutral-700 " +
          "hover:bg-gradient-to-br hover:from-neutral-50 hover:to-transparent " +
          "hover:shadow-elevation-1 hover:scale-[1.05] active:scale-[0.98]",
        success:
          "bg-gradient-to-br from-macon-teal/10 to-macon-teal/5 text-macon-teal-dark " +
          "border border-macon-teal/20 shadow-sm " +
          "hover:from-macon-teal/20 hover:to-macon-teal/10 hover:shadow-elevation-1 " +
          "hover:scale-[1.05] active:scale-[0.98] " +
          "before:absolute before:inset-0 before:bg-gradient-radial before:from-macon-teal/20 before:to-transparent " +
          "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:-z-10",
        warning:
          "bg-gradient-to-br from-warning-100 to-warning-50 text-warning-700 " +
          "border border-warning-200/50 shadow-sm " +
          "hover:from-warning-200 hover:to-warning-100 hover:shadow-elevation-1 " +
          "hover:scale-[1.05] active:scale-[0.98]",
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