"use client";

import React from "react";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRoleBadgeVariant, getRoleDisplayLabel } from "@/lib/role-badge-utils";

interface RoleBadgeProps extends Omit<BadgeProps, "variant" | "children"> {
  role: string | null | undefined;
  /** Optional override of the displayed label. Defaults to the role's localized label. */
  label?: string;
}

// A single canonical badge for showing a user's role. Centralises variant + label
// resolution so that tone (Admin = red, Partner Manager = dark blue, etc.) is
// consistent everywhere and never gets clobbered by an outer `text-*` class.
//
// Note: the Badge base already includes `text-helper` for sizing, so callers should
// NOT pass `text-helper` via `className` — twMerge would drop the variant's text
// colour token (e.g. `text-destructive-foreground`) and you'd end up with dark text
// on a red background.
export function RoleBadge({ role, label, className, ...props }: RoleBadgeProps) {
  const variant = getRoleBadgeVariant(role);
  const text = label ?? getRoleDisplayLabel(role);
  return (
    <Badge variant={variant} className={cn(className)} {...props}>
      {text}
    </Badge>
  );
}
