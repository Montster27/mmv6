import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva("rounded border-2 shadow-warm", {
  variants: {
    variant: {
      default:
        "border-border bg-card",
      highlight:
        "border-primary/20 bg-card prep-stripe-top shadow-warm-lg",
      muted:
        "border-border/60 bg-muted prep-pinstripe",
      mint:
        "border-secondary-foreground/20 bg-secondary",
      accent:
        "border-accent-foreground/20 bg-accent",
      anomaly:
        "card-anomaly border-2",
      success:
        "border-emerald-300 bg-emerald-50",
      warning:
        "border-amber-300 bg-amber-50",
      destructive:
        "border-red-300 bg-red-50",
    },
    padding: {
      default: "px-4 py-3",
      lg: "px-5 py-5",
      sm: "px-3 py-2",
      none: "",
    },
  },
  defaultVariants: {
    variant: "default",
    padding: "default",
  },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-2", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardContent, CardFooter, cardVariants }
