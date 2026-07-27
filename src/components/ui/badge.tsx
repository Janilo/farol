import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 border border-transparent px-2 py-0.5 text-[11px] font-semibold tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--farol-surface-alt)] text-[color:var(--farol-mist)]",
        brand: "bg-[color:var(--farol-beam-soft)] text-[color:var(--farol-beam-bright)]",
        success: "bg-[color:var(--farol-tier-a-soft)] text-[color:var(--farol-tier-a)]",
        warning: "bg-[color:var(--farol-tier-b-soft)] text-[color:var(--farol-beam-bright)]",
        danger: "bg-[color:var(--farol-danger-soft)] text-[color:var(--farol-danger)]",
        ai: "bg-[color:var(--farol-tier-b-soft)] text-[color:var(--farol-beam-bright)]",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
