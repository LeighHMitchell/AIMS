"use client";

/**
 * Compatibility shim for `OrganizationSearchableSelect`.
 *
 * The single canonical organization picker is now `OrganizationCombobox` in
 * `./organization-combobox.tsx`. This file forwards to it so existing callers
 * keep working without source changes.
 */

import * as React from "react";
import { OrganizationCombobox, type Organization } from "./organization-combobox";

export type { Organization };

interface OrganizationSearchableSelectProps {
  organizations: Organization[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Accepted for backwards compatibility; ignored. Popover position is handled automatically. */
  forceDirection?: "up" | "down" | "auto";
  fallbackRef?: string;
  onLegacyTypeDetected?: (org: Organization) => void;
}

export function OrganizationSearchableSelect({
  forceDirection: _forceDirection,
  ...rest
}: OrganizationSearchableSelectProps) {
  return <OrganizationCombobox {...rest} />;
}
