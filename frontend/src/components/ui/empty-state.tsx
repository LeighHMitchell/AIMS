"use client";

import React from "react";

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
}

/**
 * A standardised empty state component for table views.
 * Provides consistent styling across all list views.
 */
export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
      {icon && <div className="mb-3 flex justify-center">{icon}</div>}
      {title && <p className="text-sm font-medium mb-1">{title}</p>}
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
