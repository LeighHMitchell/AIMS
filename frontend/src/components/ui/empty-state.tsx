"use client";

import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /** Optional title displayed above the message */
  title?: string;
  /** Main message to display */
  message: string;
  /** Optional icon to display above the text */
  icon?: React.ReactNode;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * A standardised empty state component for table views, card grids, and list pages.
 * Provides consistent styling across all list views.
 */
export function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      {title && <p className="text-sm font-medium mb-1 text-balance">{title}</p>}
      <p className="text-muted-foreground text-sm">{message}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
