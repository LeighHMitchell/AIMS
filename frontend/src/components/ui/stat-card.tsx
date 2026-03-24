"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  /** Label displayed above the value */
  label: string;
  /** The main metric value */
  value: string | number;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional secondary text below the value */
  subtext?: string;
  /** Optional click handler (makes card interactive) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standardised stat card with icon-left-stacked layout.
 * Used on dashboards and overview pages across all modules.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  onClick,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-muted p-2.5 shrink-0">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {label}
            </p>
            <p className="text-2xl font-bold mt-0.5">{value}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
