"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

/**
 * Props for the EmptyState component
 */
export interface EmptyStateProps {
  /** Optional title displayed above the message */
  title?: string;
  /** Main message to display */
  message: string;
  /** Optional icon to display above the text (used when no illustration) */
  icon?: React.ReactNode;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Show the empty box illustration (default: true) */
  showIllustration?: boolean;
  /** Custom illustration image path (defaults to empty-box.webp) */
  illustration?: string;
}

/**
 * A standardised empty state component for table views, card grids, and list pages.
 * Provides consistent styling across all list views.
 */
export function EmptyState({ title, message, icon, action, showIllustration = true, illustration }: EmptyStateProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
      {showIllustration ? (
        <div className="mb-4 flex justify-center">
          <Image
            src={illustration || "/images/empty-box.webp"}
            alt="Nothing here yet"
            width={240}
            height={160}
            className="opacity-60"
          />
        </div>
      ) : icon ? (
        <div className="mb-3 flex justify-center">{icon}</div>
      ) : null}
      {title && <p className="text-body font-medium mb-1 text-balance">{title}</p>}
      <p className="text-body text-muted-foreground">{message}</p>
      {action && (
        <Button onClick={action.onClick} className="mt-4" size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
