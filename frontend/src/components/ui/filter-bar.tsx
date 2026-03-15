"use client";

import { cn } from "@/lib/utils";

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FilterBar({ children, className, ...props }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex items-end gap-3 py-2 bg-surface-muted rounded-lg px-3 border border-border mb-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
