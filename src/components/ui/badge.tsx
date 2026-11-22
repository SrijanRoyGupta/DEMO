import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      tone: {
        accent: "border-accent/30 bg-accent/10 text-accent",
        muted: "border-border bg-panel-2 text-muted",
        safe: "border-safe/30 bg-safe/10 text-safe",
        watch: "border-watch/30 bg-watch/10 text-watch",
        crit: "border-crit/30 bg-crit/10 text-crit",
      },
    },
    defaultVariants: { tone: "accent" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
