import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "bg-green-100 text-green-700 hover:bg-green-200",
        
        // High contrast variants with darker text
        gray: "bg-slate-200 text-slate-900 border border-slate-300 hover:bg-slate-300",
        blue: "bg-blue-200 text-slate-900 border border-blue-300 hover:bg-blue-300",
        purple: "bg-purple-200 text-slate-900 border border-purple-300 hover:bg-purple-300",
        green: "bg-green-200 text-slate-900 border border-green-300 hover:bg-green-300",
        cyan: "bg-cyan-200 text-slate-900 border border-cyan-300 hover:bg-cyan-300",
        indigo: "bg-indigo-200 text-slate-900 border border-indigo-300 hover:bg-indigo-300",
        pink: "bg-pink-200 text-slate-900 border border-pink-300 hover:bg-pink-300",
        rose: "bg-rose-200 text-slate-900 border border-rose-300 hover:bg-rose-300",
        orange: "bg-orange-200 text-slate-900 border border-orange-300 hover:bg-orange-300",
        amber: "bg-amber-200 text-slate-900 border border-amber-300 hover:bg-amber-300",
        yellow: "bg-yellow-200 text-slate-900 border border-yellow-300 hover:bg-yellow-300",
        lime: "bg-lime-200 text-slate-900 border border-lime-300 hover:bg-lime-300",
        emerald: "bg-emerald-200 text-slate-900 border border-emerald-300 hover:bg-emerald-300",
        teal: "bg-teal-200 text-slate-900 border border-teal-300 hover:bg-teal-300",
        sky: "bg-sky-200 text-slate-900 border border-sky-300 hover:bg-sky-300",
        violet: "bg-violet-200 text-slate-900 border border-violet-300 hover:bg-violet-300",
        fuchsia: "bg-fuchsia-200 text-slate-900 border border-fuchsia-300 hover:bg-fuchsia-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }; 