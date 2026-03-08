import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded border font-medium transition-colors",
  {
    variants: {
      variant: {
        // Cream/border — neutral tag
        default:
          "border-border bg-card text-foreground",
        // Prep navy — primary label
        navy:
          "border-primary/40 bg-primary text-primary-foreground",
        // Coral blush — events, flags, warnings
        coral:
          "border-accent-foreground/20 bg-accent text-accent-foreground",
        // Polo mint — secondary info, classes
        mint:
          "border-secondary-foreground/20 bg-secondary text-secondary-foreground",
        success:
          "border-emerald-300 bg-emerald-50 text-emerald-800",
        warning:
          "border-amber-300 bg-amber-50 text-amber-900",
        info:
          "border-primary/20 bg-primary/10 text-primary",
        destructive:
          "border-red-300 bg-red-50 text-red-800",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-xs",
        label: "px-2 py-0.5 text-[0.6rem] tracking-wider uppercase font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
