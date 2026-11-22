import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/90",
        outline: "border border-border bg-panel-2 text-fg hover:border-accent/50 hover:text-accent",
        ghost: "text-muted hover:bg-panel-2 hover:text-fg",
        watch: "border border-watch/50 bg-watch/15 text-watch hover:bg-watch/25",
        crit: "border border-crit/50 bg-crit/15 text-crit hover:bg-crit/25",
        solidCrit: "bg-crit text-fg hover:bg-crit/90",
      },
      size: {
        sm: "h-9 rounded-lg px-3 text-xs",
        md: "h-11 rounded-xl px-4 text-sm",
        lg: "h-12 rounded-xl px-5 text-sm",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
